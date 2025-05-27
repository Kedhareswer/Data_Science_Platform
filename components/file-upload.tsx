"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { useDropzone } from "react-dropzone"
import { Upload, FileSpreadsheet, X, AlertCircle, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Progress } from "@/components/ui/progress"
import { useData } from "@/lib/data-context"

interface FileUploadProps {
  className?: string
  onSuccess?: () => void
}

const MAX_FILE_SIZE = 50 * 1024 * 1024 // 50MB
const SUPPORTED_TYPES = {
  "text/csv": [".csv"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
  "application/vnd.ms-excel": [".xls"],
  "application/json": [".json"],
}

export function FileUpload({ className, onSuccess }: FileUploadProps) {
  const router = useRouter()
  const { processFile, error: contextError, isLoading } = useData()
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [success, setSuccess] = useState(false)

  const validateFile = useCallback((file: File): string | null => {
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return `File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds maximum limit of 50MB`
    }

    // Check file type
    const fileExtension = file.name.split(".").pop()?.toLowerCase()
    if (!fileExtension) {
      return "File must have a valid extension"
    }

    const supportedExtensions = Object.values(SUPPORTED_TYPES)
      .flat()
      .map((ext) => ext.slice(1))
    if (!supportedExtensions.includes(fileExtension)) {
      return `Unsupported file type. Please upload: ${supportedExtensions.join(", ")}`
    }

    // Check MIME type if available
    if (file.type && !Object.keys(SUPPORTED_TYPES).includes(file.type)) {
      return "File type does not match file extension"
    }

    return null
  }, [])

  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: any[]) => {
      setError(null)
      setSuccess(false)

      // Handle rejected files
      if (rejectedFiles.length > 0) {
        const rejection = rejectedFiles[0]
        if (rejection.errors?.[0]?.code === "file-too-large") {
          setError(`File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB`)
        } else if (rejection.errors?.[0]?.code === "file-invalid-type") {
          setError("Invalid file type. Please upload CSV, Excel, or JSON files")
        } else {
          setError("File upload failed. Please try again")
        }
        return
      }

      if (acceptedFiles.length === 0) {
        setError("No valid files selected")
        return
      }

      const selectedFile = acceptedFiles[0]

      // Additional validation
      const validationError = validateFile(selectedFile)
      if (validationError) {
        setError(validationError)
        return
      }

      setFile(selectedFile)
    },
    [validateFile],
  )

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: SUPPORTED_TYPES,
    maxFiles: 1,
    maxSize: MAX_FILE_SIZE,
    multiple: false,
  })

  const handleUpload = async () => {
    if (!file) return

    setUploading(true)
    setProgress(0)
    setError(null)

    // Create progress simulation
    const progressInterval = setInterval(() => {
      setProgress((prevProgress) => {
        if (prevProgress >= 90) {
          clearInterval(progressInterval)
          return 90
        }
        return prevProgress + Math.random() * 15
      })
    }, 200)

    try {
      await processFile(file)

      // Complete progress
      clearInterval(progressInterval)
      setProgress(100)
      setSuccess(true)

      // Navigate after success
      setTimeout(() => {
        setUploading(false)
        if (onSuccess) {
          onSuccess()
        } else {
          router.push("/notebook")
        }
      }, 1000)
    } catch (err) {
      clearInterval(progressInterval)
      setProgress(0)
      setUploading(false)

      // Handle specific error types
      if (err instanceof Error) {
        if (err.message.includes("parsing")) {
          setError("Failed to parse file. Please check file format and try again")
        } else if (err.message.includes("memory")) {
          setError("File too large for processing. Try a smaller file")
        } else if (err.message.includes("encoding")) {
          setError("File encoding not supported. Please save as UTF-8")
        } else {
          setError(err.message)
        }
      } else {
        setError("An unexpected error occurred. Please try again")
      }
    }
  }

  const removeFile = () => {
    setFile(null)
    setProgress(0)
    setError(null)
    setSuccess(false)
  }

  const resetUpload = () => {
    setFile(null)
    setProgress(0)
    setError(null)
    setSuccess(false)
    setUploading(false)
  }

  return (
    <div className={className}>
      {(error || contextError) && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Upload Error</AlertTitle>
          <AlertDescription>
            {error || contextError}
            <Button variant="outline" size="sm" className="mt-2 ml-2" onClick={resetUpload}>
              Try Again
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="mb-4 border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertTitle className="text-green-800">Upload Successful</AlertTitle>
          <AlertDescription className="text-green-700">
            File processed successfully. Redirecting to notebook...
          </AlertDescription>
        </Alert>
      )}

      <Card className="app-card">
        <CardContent className="p-6">
          {!file ? (
            <div
              {...getRootProps()}
              className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-12 text-center transition-colors cursor-pointer ${
                isDragActive && !isDragReject
                  ? "border-primary bg-primary/5"
                  : isDragReject
                    ? "border-destructive bg-destructive/5"
                    : "border-muted-foreground/25 hover:border-muted-foreground/50"
              }`}
              role="button"
              tabIndex={0}
              aria-label="Upload file area. Click or drag and drop a file here."
            >
              <input {...getInputProps()} />
              <div className="flex flex-col items-center justify-center space-y-2">
                <div className={`rounded-full p-3 ${isDragReject ? "bg-destructive/10" : "bg-primary/10"}`}>
                  <Upload className={`h-6 w-6 ${isDragReject ? "text-destructive" : "text-primary"}`} />
                </div>
                <h3 className="text-lg font-semibold">
                  {isDragActive
                    ? isDragReject
                      ? "File type not supported"
                      : "Drop your file here"
                    : "Drag & drop your file"}
                </h3>
                <p className="text-sm text-muted-foreground">
                  Supports CSV, Excel (.xlsx, .xls), and JSON files up to 50MB
                </p>
                {!isDragActive && (
                  <Button variant="outline" className="mt-2">
                    Browse Files
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <div className="rounded-full bg-primary/10 p-2">
                    <FileSpreadsheet className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{file.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(file.size / 1024).toFixed(2)} KB • {file.type || "Unknown type"}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={removeFile}
                  disabled={uploading}
                  aria-label="Remove file"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {uploading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{progress < 100 ? "Processing..." : "Complete!"}</span>
                    <span className="font-medium">{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>
              )}

              <Button className="w-full" onClick={handleUpload} disabled={uploading || isLoading || success}>
                {uploading || isLoading ? "Processing..." : success ? "Processing Complete" : "Upload & Analyze"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
