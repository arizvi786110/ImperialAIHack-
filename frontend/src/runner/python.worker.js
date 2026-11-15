/* Prototype ONLY: tests and code are browser-visible, not a secure examination sandbox. */
let pyodidePromise;
async function python() {
  if (!pyodidePromise) {
    pyodidePromise = (async () => {
      importScripts('https://cdn.jsdelivr.net/pyodide/v0.27.7/full/pyodide.js');
      return await self.loadPyodide({indexURL:'https://cdn.jsdelivr.net/pyodide/v0.27.7/full/'});
    })();
  }
  return pyodidePromise;
}
const script = `
import json, io, contextlib
payload=json.loads(cognit_payload)
out=io.StringIO()
cases=payload['tests']
results=[]
try:
    namespace={}
    with contextlib.redirect_stdout(out):
        exec(compile(payload['code'], '<student>', 'exec'), namespace)
    fn=namespace.get(payload['functionName'])
    if not callable(fn):
        raise NameError('Function not defined: '+payload['functionName'])
    for i, case in enumerate(cases):
        try:
            args=case['input']
            if not isinstance(args,list):
                raise TypeError('Test inputs must be positional argument arrays')
            with contextlib.redirect_stdout(out):
                actual=fn(*args)
            json.dumps(actual,ensure_ascii=False)
            expected=case['expected']
            passed=type(actual) is type(expected) and actual==expected
            results.append({'id':'example-'+str(i+1),'pass':passed,'actual':actual,'error':None})
        except Exception as exc:
            results.append({'id':'example-'+str(i+1),'pass':False,'actual':None,'error':type(exc).__name__+': '+str(exc)[:200]})
except Exception as exc:
    message=type(exc).__name__+': '+str(exc)[:200]
    results=[{'id':'example-'+str(i+1),'pass':False,'actual':None,'error':message} for i in range(len(cases))]
json.dumps({'stdout':out.getvalue()[:2000],'results':results},ensure_ascii=False)
`;
self.onmessage = async e => {
  try {
    const py = await python();
    py.globals.set('cognit_payload', JSON.stringify(e.data));
    const raw = await py.runPythonAsync(script);
    self.postMessage({type:'result',...JSON.parse(raw)});
  } catch (error) {
    self.postMessage({type:'error',error:String(error)});
  }
};
