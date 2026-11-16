import http.server, json, os
ROOT=os.path.dirname(os.path.abspath(__file__)); RAW=os.path.join(ROOT,"raw")
class H(http.server.BaseHTTPRequestHandler):
    def log_message(self,*a): pass
    def _send(self,code,body,ct="application/json"):
        b=body if isinstance(body,bytes) else body.encode()
        self.send_response(code); self.send_header("content-type",ct); self.send_header("content-length",str(len(b))); self.end_headers(); self.wfile.write(b)
    def do_GET(self):
        p=self.path.split("?")[0]
        if p=="/": self._send(200,open(os.path.join(ROOT,"collector.html"),"rb").read(),"text/html; charset=utf-8")
        elif p=="/catalog.json": self._send(200,open(os.path.join(ROOT,"catalog.json"),"rb").read())
        elif p=="/done": self._send(200,json.dumps(sorted(os.listdir(RAW))))
        else: self._send(404,"{}")
    def do_POST(self):
        n=int(self.headers.get("content-length","0")); data=self.rfile.read(n)
        p=self.path.split("?")[0]
        if not p.startswith("/save/"): return self._send(400,"{}")
        open(os.path.join(RAW,os.path.basename(p[6:])),"wb").write(data); self._send(200,"{}")
http.server.ThreadingHTTPServer(("127.0.0.1",8765),H).serve_forever()
