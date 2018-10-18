/**
 * Recibe la app y le agrega unas rutas definidas
 */
export function BasicRoutes(app: any) {
  // Root. Agregada de forma temporal
  app.get("/", (req, res) => {
    res.send("IBM - INVOICE Server");
  });
}
