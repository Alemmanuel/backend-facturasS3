import express from "express";
import cors from "cors";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const app = express();

// Configura CORS solo para tu frontend en Vercel y localhost (para pruebas)
app.use(cors({
  origin: [
    "https://frontend-facturas-s3.vercel.app", // producción
    "http://localhost:5500",                   // desarrollo (ajusta puerto si es otro)
  ],
  methods: ["GET", "POST", "PUT"],
  allowedHeaders: ["Content-Type"],
}));

const s3 = new S3Client({ region: "us-east-1" }); // ajusta región

app.get("/get-presigned-url", async (req, res) => {
  try {
    const fileName = req.query.fileName;
    const fileType = req.query.fileType;

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
    console.error(err);
    res.status(500).json({ error: "Error generando URL" });
  }
});

app.listen(3000, () => console.log("Servidor corriendo en http://localhost:3000"));
