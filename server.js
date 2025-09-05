import express from "express";
import cors from "cors";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import AWS from "aws-sdk";

const app = express();
app.use(cors());
app.use(express.json());

// Cliente S3
const s3 = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Cliente Textract
AWS.config.update({
  region: process.env.AWS_REGION || "us-east-1",
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});
const textract = new AWS.Textract();

// Endpoint para obtener presigned URL
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

// 🆕 Endpoint para analizar factura con Textract y devolver JSON
app.post("/extract-factura", async (req, res) => {
  try {
    const { fileName } = req.body;
    const bucket = process.env.S3_BUCKET_NAME || "facturas-s3";

    if (!fileName) {
      return res.status(400).json({ error: "Falta fileName" });
    }

    const params = {
      Document: {
        S3Object: {
          Bucket: bucket,
          Name: fileName,
        },
      },
      FeatureTypes: ["TABLES", "FORMS"],
    };

    const data = await textract.analyzeDocument(params).promise();

    // Extraer todas las líneas de texto
    const blocks = data.Blocks.filter((b) => b.BlockType === "LINE");
    const texto = blocks.map((b) => b.Text).join("\n");

    // Regex simples para detectar campos clave
    const numeroFactura = texto.match(/Factura\s*(No\.?|N°|#)[:\s]*([A-Za-z0-9\-]+)/i)?.[2] || null;
    const fecha = texto.match(/Fecha[:\s]*([\d\/\-]+)/i)?.[1] || null;
    const cliente = texto.match(/Cliente[:\s]*(.+)/i)?.[1] || null;
    const total = texto.match(/Total[:\s]*([\d\.,]+ ?[A-Z]{0,3})/i)?.[1] || null;

    const result = {
      numero_factura: numeroFactura,
      fecha,
      cliente,
      total,
      texto_completo: texto // por si quieres ver el OCR completo
    };

    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Error procesando la factura" });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en puerto ${PORT}`);
});
