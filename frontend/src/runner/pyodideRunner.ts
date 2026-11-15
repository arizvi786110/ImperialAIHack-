import type { Runner, RunResult } from './types'

export const pyodideRunner: Runner = {
  async run(code, functionName, tests): Promise<RunResult> {
    const worker = new Worker(new URL('./python.worker.js', import.meta.url), { type: 'classic' })
    const fail = (reason: string) => tests.map((_, index) => ({
      id: 'example-' + (index + 1), pass: false, actual: null, error: reason
    }))
    return await new Promise<RunResult>((resolve) => {
      let finished = false
      let timer: ReturnType<typeof setTimeout>
      function done(result: RunResult) {
        if (finished) return
        finished = true
        clearTimeout(timer)
        worker.terminate()
        resolve(result)
      }
      timer = setTimeout(() => done({stdout:'',results:fail('Timed out'),timedOut:true,error:'Execution stopped after 12 seconds'}),12000)
      worker.onerror = e => done({stdout:'',results:fail(e.message),timedOut:false,error:e.message})
      worker.onmessage = e => {
        const message = e.data as {type:string,stdout?:string,results?:RunResult['results'],error?:string}
        if(message.type==='result') done({stdout:message.stdout??'',results:message.results??fail('No results returned'),timedOut:false})
        if(message.type==='error') done({stdout:'',results:fail(message.error??'Runner error'),timedOut:false,error:message.error})
      }
      worker.postMessage({code,functionName,tests})
    })
  },
}
