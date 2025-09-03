import express from "express";
import cors from "cors";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const app = express();

// 🌍 Configuración CORS (localhost + producción)
const allowedOrigins = [
  "http://localhost:5500", // para pruebas locales
  "http://localhost:3000", // si lo corres en React/Vite
  "https://frontend-facturas-s3.vercel.app/"   // por si lo subes a Vercel
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("No autorizado por CORS"));
    }
  },
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type", "Authorization"]
}));

// Cliente S3
const s3 = new S3Client({ region: "us-east-1" }); // ajusta a tu región

// Endpoint para generar URL firmada
app.get("/get-presigned-url", async (req, res) => {
  try {
    const fileName = req.query.fileName;
    const fileType = req.query.fileType;

    // Validación de archivos permitidos
    if (!fileName.endsWith(".pdf") && !fileName.endsWith(".png")) {
      return res.status(400).json({ error: "Solo se permiten facturas PDF o PNG" });
    }

    const command = new PutObjectCommand({
      Bucket: "facturas-s3",
      Key: fileName,
      ContentType: fileType,
    });

    const url = await getSignedUrl(s3, command, { expiresIn: 60 });

    res.json({ url });
  } catch (err) {
    console.error("❌ Error generando presigned URL:", err);
    res.status(500).json({ error: "Error generando URL" });
  }
});

app.listen(3000, () => console.log("✅ Servidor corriendo en http://localhost:3000"));
