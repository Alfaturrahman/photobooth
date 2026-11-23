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

function addPhoto(url, label) {
  const card = document.createElement('figure');
  card.className = 'tile';
  card.innerHTML = '<img alt="Foto dari tamu"><figcaption></figcaption>';
  card.querySelector('img').src = url;
  card.querySelector('figcaption').textContent = `NEW / ${label}`;
  document.querySelector('.gallery').prepend(card);
}

function addWish({ name, message }) {
  const card = document.createElement('article');
  card.innerHTML = '<span>"</span><p></p><b></b>';
  card.querySelector('p').textContent = message;
  card.querySelector('b').textContent = name;
  document.querySelector('#wishList').prepend(card);
}

function toDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function uploadPhoto(blob, label) {
  if (blob.size > 5 * 1024 * 1024) throw new Error('Ukuran foto maksimal 5 MB.');
  const response = await fetch('/api/photos', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ image: await toDataUrl(blob) }),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Foto gagal disimpan.');
  addPhoto(result.url, label);
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

document.querySelector('#openCamera').addEventListener('click', () => modal.showModal());
document.querySelector('#heroCamera').addEventListener('click', () => modal.showModal());
document.querySelector('#scanCamera').addEventListener('click', () => modal.showModal());
document.querySelector('#closeCamera').addEventListener('click', () => modal.close());
modal.addEventListener('close', stopCamera);
startCamera.addEventListener('click', enableCamera);
takePhoto.addEventListener('click', () => {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  canvas.getContext('2d').drawImage(video, 0, 0);
  canvas.toBlob(async (blob) => {
    if (!blob) return;
    try {
      cameraStatus.textContent = 'Menyimpan foto...';
      await uploadPhoto(blob, 'Captured now');
      stopCamera();
      modal.close();
      document.querySelector('#galeri').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (error) { cameraStatus.textContent = error.message; }
  }, 'image/jpeg', .85);
});
document.querySelector('#photoUpload').addEventListener('change', async (event) => {
  const [file] = event.target.files;
  if (!file) return;
  try {
    cameraStatus.textContent = 'Menyimpan foto...';
    await uploadPhoto(file, 'From gallery');
    modal.close();
    document.querySelector('#galeri').scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (error) { cameraStatus.textContent = error.message; }
  event.target.value = '';
});
document.querySelector('#soundToggle').addEventListener('click', (event) => {
  const label = event.currentTarget.querySelector('span');
  label.textContent = label.textContent === 'Sound on' ? 'Sound off' : 'Sound on';
});
document.querySelector('#wishForm').addEventListener('submit', async (event) => {
  event.preventDefault();
  const name = document.querySelector('#name');
  const message = document.querySelector('#message');
  const response = await fetch('/api/wishes', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: name.value, message: message.value }) });
  const result = await response.json();
  if (!response.ok) return;
  addWish(result);
  event.currentTarget.reset();
});
Promise.all([fetch('/api/photos').then((response) => response.json()), fetch('/api/wishes').then((response) => response.json())]).then(([photos, wishes]) => {
  photos.reverse().forEach((photo) => addPhoto(photo.url, 'Guest memory'));
  wishes.reverse().forEach(addWish);
}).catch(() => {});

document.querySelector('#qrCode').src = `https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(location.href)}`;
