import express from "express";
import cors from "cors";
import multer from "multer";
import Tesseract from "tesseract.js";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const app = express();
app.use(cors());
app.use(express.json());

const upload = multer({ dest: "uploads/" });

// Cliente S3 (solo para subir a tu bucket)
const s3 = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Presigned URL (por si quieres seguir usando S3 directo desde el frontend)
app.get("/get-presigned-url", async (req, res) => {
  try {
    const { fileName, fileType } = req.query;

    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME || "facturas-s3",
      Key: fileName,
      ContentType: fileType,
    });

    const url = await getSignedUrl(s3, command, { expiresIn: 60 });
    res.json({ url });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error generando URL firmada" });
  }
});

// 🆕 Endpoint para procesar factura con OCR local
app.post("/extract-factura", upload.single("file"), async (req, res) => {
  try {
    const result = await Tesseract.recognize(req.file.path, "spa");
    const texto = result.data.text;

    // Regex básicos para extraer campos
    const numeroFactura = texto.match(/Factura\s*(No\.?|N°|#)[:\s]*([A-Za-z0-9\-]+)/i)?.[2] || null;
    const fecha = texto.match(/Fecha[:\s]*([\d\/\-]+)/i)?.[1] || null;
    const cliente = texto.match(/Cliente[:\s]*(.+)/i)?.[1] || null;
    const total = texto.match(/Total[:\s]*([\d\.,]+ ?[A-Z]{0,3})/i)?.[1] || null;

    res.json({
      numero_factura: numeroFactura,
      fecha,
      cliente,
      total,
      texto_completo: texto,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error procesando la factura" });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
