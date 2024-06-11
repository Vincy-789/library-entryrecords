

// Populate video source dropdown
navigator.mediaDevices.enumerateDevices()
    .then(function(devices) {
        const videoSource = document.getElementById('videoSource');
        devices.forEach(function(device) {
            if (device.kind === 'videoinput') {
                const option = document.createElement('option');
                option.value = device.deviceId;
                option.text = device.label || 'camera ' + (videoSource.length + 1);
                videoSource.appendChild(option);
            }
        });
    })
    .catch(function(err) {
        console.log(err.name + ": " + err.message);
    });

// Start Quagga when the start button is clicked
let barcodeDetected = false;

document.getElementById('startButton').addEventListener('click', function() {
    barcodeDetected = false;

    if (typeof Quagga === 'object' && Quagga.running) {
        Quagga.stop(); // Stop any previous instances of Quagga
    }

    Quagga.init({
        inputStream: {
            type : "LiveStream",
            constraints: {
                width: 640,
                height: 480,
                facingMode: "environment", // or "user" for selfie mode
                deviceId: document.getElementById('videoSource').value
            },
            target: document.querySelector('#interactive')    // Select the ID of the viewport
        },
        decoder: {
            readers: ["code_128_reader"]
        }
    }, function(err) {
        if (err) {
            console.log(err);
            return
        }
        Quagga.start();
    });

    Quagga.onDetected(function(data) {
        if (!barcodeDetected) {
            barcodeDetected = true;

            console.log(data.codeResult.code);

            // Stop the camera
            Quagga.stop();

            // Display the barcode data on the web page
            const brdata = data.codeResult.code;
            const datalength = brdata.length;
            if (datalength === 7) {
                document.getElementById('barcodeResult').textContent = data.codeResult.code;
                const successSound = document.getElementById('successSound');
                successSound.play();
                //send information to server
                document.getElementById('barcodeInput').value = data.codeResult.code;
                document.getElementById('barcodeForm').submit().then(console.log('sent'));
            }else{
                document.getElementById('barcodeResult').textContent = "Rescan";
                document.getElementById('barcodeResult').classList.add("error");
                const successSound = document.getElementById('successSound');
                successSound.play();
            }
            
        }
    });
});