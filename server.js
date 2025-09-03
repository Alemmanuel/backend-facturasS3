import express from "express"
import cors from "cors"
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

const app = express()
app.use(cors())

const s3 = new S3Client({
  region: "us-east-1",
  credentials: {
    accessKeyId: "AKIARU7LTCQPAJAFVBXZ", // Reemplaza con tu access key
    secretAccessKey: "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", // Reemplaza con tu secret key
  },
})

// Endpoint para obtener presigned URL
app.get("/get-presigned-url", async (req, res) => {
  try {
    const { fileName, fileType } = req.query

    const command = new PutObjectCommand({
      Bucket: "facturas-s3", // 🔹 tu bucket
      Key: fileName,
      ContentType: fileType,
    })

    const url = await getSignedUrl(s3, command, { expiresIn: 60 })

    res.json({ url })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: "Error generando URL firmada" })
  }
})

app.listen(3001, () => {
  console.log("Servidor corriendo en http://localhost:3001")
})
