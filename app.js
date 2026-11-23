const modal = document.querySelector('#cameraModal');
document.querySelector('#openCamera').addEventListener('click', () => modal.showModal());
document.querySelector('#closeCamera').addEventListener('click', () => modal.close());
document.querySelector('#soundToggle').addEventListener('click', (event) => {
  const label = event.currentTarget.querySelector('span');
  label.textContent = label.textContent === 'Sound on' ? 'Sound off' : 'Sound on';
});
document.querySelector('#wishForm').addEventListener('submit', (event) => {
  event.preventDefault();
  const name = document.querySelector('#name');
  const message = document.querySelector('#message');
  const card = document.createElement('article');
  card.innerHTML = `<span>“</span><p></p><b></b>`;
  card.querySelector('p').textContent = message.value;
  card.querySelector('b').textContent = name.value;
  document.querySelector('#wishList').prepend(card);
  event.currentTarget.reset();
});
