import tornado.web

class IndexGraphHandler(tornado.web.RequestHandler):
    def get(self):
        t = self.application.loader.load("index_graph.html")
        self.write(
            t.generate(
                gs_globals=self.application.gs_globals,
                user=self.get_current_user(),
            )
        )