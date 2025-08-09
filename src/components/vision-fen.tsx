"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type Cropper from "cropperjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Camera, Upload, RefreshCw, X, Copy } from "lucide-react";
import { Skeleton } from "./ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "./ui/alert";

// TypeScript definition for Cropper.js from window object
declare global {
  interface Window {
    Cropper: typeof Cropper;
  }
}

enum AppState {
  Idle,
  CameraOpen,
  ImageCaptured,
  Loading,
  FenReceived,
  Error,
}

export function VisionFen() {
  const [appState, setAppState] = useState<AppState>(AppState.Idle);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [fen, setFen] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const cropperRef = useRef<Cropper | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const { toast } = useToast();

  const cleanupCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);
  
  const requestCameraPermission = async () => {
    cleanupCamera();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      setHasCameraPermission(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        streamRef.current = stream;
        setAppState(AppState.CameraOpen);
      }
    } catch (err) {
      console.error("Camera error:", err);
      setHasCameraPermission(false);
      const errorMessage = "Could not access the camera. Please check permissions and try again.";
      setError(errorMessage);
      setAppState(AppState.Error);
      toast({
        variant: "destructive",
        title: "Camera Error",
        description: "Could not access camera. Please check browser permissions.",
      });
    }
  };

  const handleCapture = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        setImageDataUrl(canvas.toDataURL("image/jpeg"));
        setAppState(AppState.ImageCaptured);
        cleanupCamera();
      }
    }
  };

  useEffect(() => {
    if (appState === AppState.ImageCaptured && imageRef.current && imageDataUrl) {
      if (typeof window.Cropper !== "function") {
        setError("Cropper.js not loaded. Please refresh the page.");
        setAppState(AppState.Error);
        return;
      }
      
      const cropper = new window.Cropper(imageRef.current, {
        aspectRatio: 1,
        viewMode: 1,
        dragMode: 'move',
        background: false,
        autoCropArea: 0.9,
        movable: true,
        zoomable: true,
        scalable: true,
        rotatable: true,
      });
      cropperRef.current = cropper;
    }

    return () => {
      if (cropperRef.current) {
        cropperRef.current.destroy();
      }
    };
  }, [appState, imageDataUrl]);

  const handleSubmit = () => {
    if (!cropperRef.current) return;

    setAppState(AppState.Loading);
    
    cropperRef.current.getCroppedCanvas({
      width: 512,
      height: 512,
      imageSmoothingEnabled: true,
      imageSmoothingQuality: 'high',
    }).toBlob(async (blob) => {
      if (!blob) {
        setError("Could not process image for submission.");
        setAppState(AppState.Error);
        return;
      }

      const formData = new FormData();
      formData.append("file", blob, "chessboard.jpg");

      try {
        const response = await fetch("http://10.147.210.166:8000/predict", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Server responded with status: ${response.status}`);
        }

        const result = await response.json();
        if (result.fen) {
          setFen(result.fen);
          setAppState(AppState.FenReceived);
        } else {
          throw new Error("Invalid response from server.");
        }
      } catch (err) {
        const errorMessage = "Failed to get FEN. The server might be down or the image is not a valid chessboard.";
        setError(errorMessage);
        setAppState(AppState.Error);
        toast({
          variant: "destructive",
          title: "Submission Failed",
          description: "Could not get FEN from the server. Please try again.",
        });
      } finally {
        setImageDataUrl(null);
      }
    }, "image/jpeg");
  };

  const handleReset = () => {
    cleanupCamera();
    setImageDataUrl(null);
    setFen(null);
    setError(null);
    setAppState(AppState.Idle);
    setHasCameraPermission(null);
  };

  const handleRetake = () => {
    setImageDataUrl(null);
    setError(null);
    requestCameraPermission();
  };

  const copyFenToClipboard = () => {
    if (fen) {
      navigator.clipboard.writeText(fen);
      toast({
        title: "Copied to clipboard!",
      });
    }
  };

  const renderContent = () => {
    switch (appState) {
      case AppState.CameraOpen:
        return (
          <Card className="w-full max-w-2xl shadow-xl animate-in fade-in zoom-in-95">
            <CardHeader>
              <CardTitle>Capture Position</CardTitle>
              <CardDescription>Center the chessboard in the frame and capture.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative aspect-video w-full overflow-hidden rounded-md bg-muted">
                <video ref={videoRef} className="h-full w-full object-cover" playsInline autoPlay />
              </div>
               {hasCameraPermission === false && (
                <Alert variant="destructive" className="mt-4">
                  <AlertTitle>Camera Access Denied</AlertTitle>
                  <AlertDescription>
                    Please enable camera permissions in your browser settings to use this feature.
                  </AlertDescription>
                </Alert>
              )}
              <div className="mt-4 flex justify-between">
                <Button variant="outline" onClick={handleReset}><X className="mr-2 h-4 w-4" />Close</Button>
                <Button className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleCapture}><Camera className="mr-2 h-4 w-4" />Capture</Button>
              </div>
            </CardContent>
          </Card>
        );

      case AppState.ImageCaptured:
        return (
          <Card className="w-full max-w-2xl shadow-xl animate-in fade-in zoom-in-95">
            <CardHeader>
              <CardTitle>Crop Image</CardTitle>
              <CardDescription>Adjust the box to tightly fit the chessboard.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="max-h-[60vh] bg-muted img-container">
                <img ref={imageRef} src={imageDataUrl || ''} alt="Captured chessboard" style={{ display: 'block', maxWidth: "100%" }} />
              </div>
              <div className="mt-4 flex justify-between">
                <Button variant="outline" onClick={handleRetake}><RefreshCw className="mr-2 h-4 w-4" />Retake</Button>
                <Button className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleSubmit}><Upload className="mr-2 h-4 w-4" />Submit</Button>
              </div>
            </CardContent>
          </Card>
        );
      
      case AppState.Loading:
        return (
            <Card className="w-full max-w-md shadow-xl text-center p-8 animate-in fade-in">
              <CardHeader>
                <CardTitle className="flex justify-center items-center">
                   <RefreshCw className="mr-3 h-8 w-8 animate-spin text-primary" />
                   Analyzing Image...
                </CardTitle>
                <CardDescription>Please wait while we process your chessboard.</CardDescription>
              </CardHeader>
              <CardContent>
                <Skeleton className="w-full h-8" />
              </CardContent>
            </Card>
        );

      case AppState.FenReceived:
        return (
          <Card className="w-full max-w-md shadow-xl animate-in fade-in zoom-in-95">
            <CardHeader>
              <CardTitle>Your FEN String</CardTitle>
              <CardDescription>The Forsyth-Edwards Notation for your position.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="relative rounded-md bg-muted p-4 font-mono text-sm break-all">
                {fen}
                <Button variant="ghost" size="icon" className="absolute top-1 right-1 h-8 w-8" onClick={copyFenToClipboard}>
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <div className="mt-4 flex justify-end">
                <Button className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleReset}>Start Over</Button>
              </div>
            </CardContent>
          </Card>
        );

      case AppState.Error:
        return (
          <Card className="w-full max-w-md shadow-xl animate-in fade-in zoom-in-95 border-destructive">
            <CardHeader>
              <CardTitle className="text-destructive">An Error Occurred</CardTitle>
            </CardHeader>
            <CardContent>
              <p>{error}</p>
              <div className="mt-4 flex justify-end">
                <Button variant="destructive" onClick={handleReset}>Try Again</Button>
              </div>
            </CardContent>
          </Card>
        );

      case AppState.Idle:
      default:
        return (
          <div className="text-center animate-in fade-in zoom-in-95 duration-500">
            <h1 className="text-5xl font-bold font-headline text-primary">VisionFEN</h1>
            <p className="mt-4 text-lg text-muted-foreground">Get a FEN string from your chessboard in a snap.</p>
            <Button size="lg" className="mt-8 bg-accent text-accent-foreground hover:bg-accent/90" onClick={requestCameraPermission}>
              <Camera className="mr-2 h-5 w-5" />
              Scan Chessboard
            </Button>
          </div>
        );
    }
  };

  return (
    <>
      <style>{`.cropper-view-box { box-shadow: 0 0 0 1px #6699CC; border-radius: 0; outline: 0; } .cropper-line, .cropper-point { background-color: #6699CC; }`}</style>
      <div className="w-full max-w-3xl flex flex-col items-center justify-center">
        {renderContent()}
      </div>
    </>
  );
}
