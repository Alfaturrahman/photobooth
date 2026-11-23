const modal = document.querySelector('#cameraModal');
const video = document.querySelector('#cameraPreview');
const canvas = document.querySelector('#cameraCanvas');
const startCamera = document.querySelector('#startCamera');
const takePhoto = document.querySelector('#takePhoto');
const cameraStatus = document.querySelector('#cameraStatus');
let stream;

function stopCamera() {
  stream?.getTracks().forEach((track) => track.stop());
  stream = undefined;
  video.srcObject = null;
  takePhoto.disabled = true;
  startCamera.textContent = 'Aktifkan kamera';
}

async function enableCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    cameraStatus.textContent = 'Browser ini tidak mendukung akses kamera.';
    return;
  }
  try {
    stopCamera();
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
    video.srcObject = stream;
    await video.play();
    takePhoto.disabled = false;
    startCamera.textContent = 'Ganti kamera';
    cameraStatus.textContent = 'Siap. Cari momen terbaik, lalu tekan tombol foto.';
  } catch {
    cameraStatus.textContent = 'Kamera tidak bisa diakses. Izinkan kamera atau pilih foto dari galeri.';
  }
}

function addPhoto(url, label) {
  const card = document.createElement('figure');
  card.className = 'tile';
  card.innerHTML = '<img alt="Foto dari tamu"><figcaption></figcaption>';
  card.querySelector('img').src = url;
  card.querySelector('figcaption').textContent = `NEW / ${label}`;
  document.querySelector('.gallery').prepend(card);
  document.querySelector('#galeri').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

document.querySelector('#openCamera').addEventListener('click', () => modal.showModal());
document.querySelector('#closeCamera').addEventListener('click', () => modal.close());
modal.addEventListener('close', stopCamera);
startCamera.addEventListener('click', enableCamera);
takePhoto.addEventListener('click', () => {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d').drawImage(video, 0, 0);
  canvas.toBlob((blob) => {
    if (!blob) return;
    addPhoto(URL.createObjectURL(blob), 'Captured now');
    stopCamera();
    modal.close();
  }, 'image/jpeg', .9);
});
document.querySelector('#photoUpload').addEventListener('change', (event) => {
  const [file] = event.target.files;
  if (!file) return;
  addPhoto(URL.createObjectURL(file), 'From gallery');
  modal.close();
  event.target.value = '';
});
document.querySelector('#soundToggle').addEventListener('click', (event) => {
  const label = event.currentTarget.querySelector('span');
  label.textContent = label.textContent === 'Sound on' ? 'Sound off' : 'Sound on';
});
document.querySelector('#wishForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const name = document.querySelector('#name');
  const message = document.querySelector('#message');
  const card = document.createElement('article');
  card.innerHTML = '<span>"</span><p></p><b></b>';
  card.querySelector('p').textContent = message.value;
  card.querySelector('b').textContent = name.value;
  document.querySelector('#wishList').prepend(card);
  event.currentTarget.reset();
});
