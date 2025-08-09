# **App Name**: VisionFEN

## Core Features:

- Camera Access: Provide a button to open the device's camera using the HTML5 getUserMedia API.
- Image Capture: Implement a user interface to capture an image from the camera feed.
- Image Cropping: Integrate Cropper.js to allow the user to crop the captured image.
- Image Resizing: Resize the cropped image to 512x512 pixels.
- Image Submission: Send the resized image as multipart/form-data with key "file" to the backend at http://10.147.210.166:8000/predict via a POST request.
- FEN Display: Display the FEN string received from the backend in a styled box.

## Style Guidelines:

- Primary color: A subdued blue (#6699CC) to evoke trust and focus.
- Background color: Very light blue (#F0F8FF) to ensure readability and a clean interface.
- Accent color: A warm orange (#FFB347) for interactive elements to draw attention.
- Body and headline font: 'Inter', a grotesque-style sans-serif with a modern look, will be used for both headings and body text to ensure legibility and a clean aesthetic.
- Ensure a mobile-friendly layout with elements centered on the screen for optimal viewing experience.
- Use subtle transitions and animations when opening the camera or displaying the FEN string to provide a polished feel.