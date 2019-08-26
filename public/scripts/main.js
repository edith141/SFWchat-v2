'use strict';

// UI Elems
const signInButtonElement = document.querySelector('#sign-in');
const submitButtonElement = document.querySelector('#submit');
const messageInputElement = document.querySelector('#message');
const imageButtonElement = document.querySelector('#submitImage');
const messageListElement = document.querySelector('#messages');
const signInSnackbarElement = document.querySelector('#must-signin-snackbar');
const imageFormElement = document.querySelector('#image-form');
const userPicElement = document.querySelector('#user-pic');
const messageFormElement = document.querySelector('#message-form');
const mediaCaptureElement = document.querySelector('#mediaCapture');
const signOutButtonElement = document.querySelector('#sign-out');
const userNameElement = document.querySelector('#user-name');

// event listeners for buttons and form submits
//have to declare functions later..
messageFormElement.addEventListener('submit', onMessageFormSubmit);
signOutButtonElement.addEventListener('click', signOut);
signInButtonElement.addEventListener('click', signIn);
messageInputElement.addEventListener('keyup', toggleButton);
messageInputElement.addEventListener('change', toggleButton);
imageButtonElement.addEventListener('click', (evt) => {
  evt.preventDefault();
  mediaCaptureElement.click();
});
mediaCaptureElement.addEventListener('change', onMediaFileSelected);
