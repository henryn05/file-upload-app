const express = require("express");
const fileUpload = require("express-fileupload");
const {
  S3Client,
  ListObjectsV2Command,
  PutObjectCommand,
  GetObjectCommand,
} = require("@aws-sdk/client-s3");
// const fs = require("fs");
// const path = require("path");

const app = express();
const port = 4566;

const s3Client = new S3Client({
  region: "us-east-1",
  endpoint: "http://localhost:4566",
  forcePathStyle: true,
});

const IMAGES_BUCKET = "instance-profile";
const UPLOAD_TEMP_PATH = "/tmp/uploads";

app.use(fileUpload());

// Serve index.html for the root URL
app.get(`/${IMAGES_BUCKET}`, (req, res) => {
  const params = {
    Bucket: "instance-profile",
    Key: "index.html",
  };

  s3.getObject(params, (err, data) => {
    if (err) {
      res.status(500).send(err);
    } else {
      res.set("Content-Type", "text/html");
      res.send(data.Body.toString());
    }
  });
});

// List all objects in a bucket
app.get("/${IMAGES_BUCKET}", async (req, res) => {
  try {
    const listObjectsParams = { Bucket: IMAGES_BUCKET };
    const command = new ListObjectsV2Command(listObjectsParams);
    const response = await s3Client.send(command);
    res.send(response);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error listing files.");
  }
});

// Retrieve an object from a bucket
app.get(`/${IMAGES_BUCKET}/:fileName`, async (req, res) => {
  const fileName = req.query.fileName;

  if (!fileName) {
    return res.status(400).send("File name is required.");
  }

  try {
    const getObjectParams = { Bucket: IMAGES_BUCKET, Key: fileName };
    const command = new GetObjectCommand(getObjectParams);
    const response = await s3Client.send(command);
    response.Body.pipe(res);
  } catch (error) {
    console.error(error);
    res.status(500).send("Error retrieving file.");
  }
});

// Upload an object to a bucket
app.post(`/${IMAGES_BUCKET}`, async (req, res) => {
  const file = req.files.image;

  if (!file) {
    return res.status(400).send("No file uploaded.");
  }

  try {
    const uploadParams = {
      Bucket: IMAGES_BUCKET,
      Key: file.name,
      Body: file.data,
    };
    const command = new PutObjectCommand(uploadParams);
    await s3Client.send(command);
    res.send("File uploaded successfully.");
  } catch (error) {
    console.error(error);
    res.status(500).send("Error uploading file.");
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
