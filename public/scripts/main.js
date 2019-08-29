
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
// msg template string.
const MESSAGE_TEMPLATE =
    '<div class="message-container">' +
      '<div class="spacing"><div class="pic"></div></div>' +
      '<div class="message"></div>' +
      '<div class="name"></div>' +
    '</div>';
// A loading image URL.
var LoadingPlaceholderImg = 'https://www.google.com/images/spin-32.gif?a';


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


// authentication events
function signIn() {
  var provider = new firebase.auth.GoogleAuthProvider();
  firebase.auth().signInWithPopup(provider);
}

function signOut() {
  firebase.auth().signOut();
}

// Fbase auth
function initFirebaseAuth() {
  firebase.auth().onAuthStateChanged(setupUI);
}

// Users profile-pic
function getUserImgUrl() {
  return firebase.auth().currentUser.photoURL || '/images/default-pp-placeholder.png';
}

// Users name
function getUserName() {
  return firebase.auth().currentUser.displayName;
}

// Returns true if a user is signed-in.
function isUserSignedIn() {
  return firebase.auth().currentUser ? true : false;
}

// push msg to fstore
function pushMsgToFS(messageText) {
  console.log('save msg');
  return firebase.firestore().collection('messages').add({
    name: getUserName(),
    text: messageText,
    profilePicUrl: getUserImgUrl(),
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  }).catch(function(error) {
    console.error('can not write to db \n:', error);
  });
}

// Realtime listener for msgs.
function loadMessages() {
  firebase.firestore().collection('messages').orderBy('timestamp', 'desc')
  .onSnapshot( (snapshot) => {
    snapshot.docChanges().forEach( (change) => {
      //check if msg was removed or added/modified.
      if (change.type != 'removed') {
        var message = change.doc.data();
        displayMessage(change.doc.id, message.timestamp, message.name,
                       message.text, message.profilePicUrl, message.imageUrl);
      } else {
        deleteMessage(change.doc.id);
      }
    });
  });
}

//Notifications tokens for future use...
function saveMessagingDeviceToken() {
  firebase.messaging().getToken().then(function(currToken) {
    if (currToken) {
      console.log('Token:', currToken);
      // Saving the Device Token to the datastore.
      firebase.firestore().collection('fcmTokens').doc(currToken)
          .set({uid: firebase.auth().currentUser.uid});
    } else {
      askForNotifications();
    }
  }).catch(function(error){
    console.error('No token!', error);
  });
}

function askForNotifications() {
  console.log('Notification?');
  firebase.messaging().requestPermission().then(function() {
    console.log('Success!')
    saveMessagingDeviceToken();
  }).catch(function(error) {
    console.error('Not allowed!', error);
  });
}


//Handle images
function saveImgMsg(file) {
  // init with placeholder loading img
  firebase.firestore().collection('messages').add({
    name: getUserName(),
    imageUrl: LoadingPlaceholderImg,
    profilePicUrl: getUserImgUrl(),
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  }).then(function(messageRef) {
    // upload img to users dir
    let filePath = firebase.auth().currentUser.uid + '/' + messageRef.id + '/' + file.name;
    return firebase.storage().ref(filePath).put(file).then(function(fileSnapshot) {
      // img pub url
      return fileSnapshot.ref.getDownloadURL().then((url) => {
        // update placeholder img to real img
        return messageRef.update({
          imageUrl: url,
          storageUri: fileSnapshot.metadata.fullPath
        });
      });
    });
  }).catch(function(error) {
    console.error('Cloud Storage not uploading img:', error);
  });
}


// Triggered when a file is selected via the media picker.
function onMediaFileSelected(event) {
  event.preventDefault();
  var file = event.target.files[0];

  // Clear the selection in the file picker input.
  imageFormElement.reset();

  // Check if the file is an image.
  if (!file.type.match('image.*')) {
    var data = {
      message: 'You can only share images',
      timeout: 2000
    };
    signInSnackbarElement.MaterialSnackbar.showSnackbar(data);
    return;
  }
  // Check if the user is signed-in
  if (checkSignedInWithMessage()) {
    saveImgMsg(file);
  }
}

// Triggered when the send new message form is submitted.
function onMessageFormSubmit(e) {
  e.preventDefault();
  // Check that the user entered a message and is signed in.
  if (messageInputElement.value && checkSignedInWithMessage()) {
    pushMsgToFS(messageInputElement.value).then( () => {
      console.log('save msg then');
      // Clear message text field and re-enable the SEND button.
      resetMaterialTextfield(messageInputElement);
      toggleButton();
    });
  }
}

// Triggers when the auth state change for instance when the user signs-in or signs-out.
function setupUI(user) {
  if (user) { // User is signed in!
    // Get the signed-in user's profile pic and name.
    var profilePicUrl = getUserImgUrl();
    var userName = getUserName();

    // Set the user's profile pic and name.
    userPicElement.style.backgroundImage = 'url(' + addSizeToGoogleProfilePic(profilePicUrl) + ')';
    userNameElement.textContent = userName;

    // Show user's profile and sign-out button.
    userNameElement.removeAttribute('hidden');
    userPicElement.removeAttribute('hidden');
    signOutButtonElement.removeAttribute('hidden');

    // Hide sign-in button.
    signInButtonElement.setAttribute('hidden', 'true');

    // We save the Firebase Messaging Device token and enable notifications.
    saveMessagingDeviceToken();
  } else { // User is signed out!
    // Hide user's profile and sign-out button.
    userNameElement.setAttribute('hidden', 'true');
    userPicElement.setAttribute('hidden', 'true');
    signOutButtonElement.setAttribute('hidden', 'true');

    // Show sign-in button.
    signInButtonElement.removeAttribute('hidden');
  }
}

// Returns true if user is signed-in. Otherwise false and displays a message.
function checkSignedInWithMessage() {
  // Return true if the user is signed in Firebase
  if (isUserSignedIn()) {
    return true;
  }

  // Display a message to the user using a Toast.
  var data = {
    message: 'You must sign-in first',
    timeout: 2000
  };
  signInSnackbarElement.MaterialSnackbar.showSnackbar(data);
  return false;
}

// Resets the given MaterialTextField.
function resetMaterialTextfield(element) {
  console.log('reset ip fld');
  element.value = '';
  element.parentNode.MaterialTextfield.boundUpdateClassesHandler();
}



// Adds a size to Google Profile pics URLs.
function addSizeToGoogleProfilePic(url) {
  if (url.indexOf('googleusercontent.com') !== -1 && url.indexOf('?') === -1) {
    return url + '?sz=150';
  }
  return url;
}



// Delete a Message from the UI.
function deleteMessage(id) {
  var div = document.getElementById(id);
  // If an element for that message exists we delete it.
  if (div) {
    div.parentNode.removeChild(div);
  }
}

function createAndInsertMessage(id, timestamp) {
  const container = document.createElement('div');
  container.innerHTML = MESSAGE_TEMPLATE;
  const div = container.firstChild;
  div.setAttribute('id', id);

  // If timestamp is null, assume we've gotten a brand new message.
  // https://stackoverflow.com/a/47781432/4816918
  timestamp = timestamp ? timestamp.toMillis() : Date.now();
  div.setAttribute('timestamp', timestamp);

  // figure out where to insert new message
  const existingMessages = messageListElement.children;
  if (existingMessages.length === 0) {
    messageListElement.appendChild(div);
  } else {
    let messageListNode = existingMessages[0];

    while (messageListNode) {
      const messageListNodeTime = messageListNode.getAttribute('timestamp');

      if (!messageListNodeTime) {
        throw new Error(
          `Child ${messageListNode.id} has no 'timestamp' attribute`
        );
      }

      if (messageListNodeTime > timestamp) {
        break;
      }

      messageListNode = messageListNode.nextSibling;
    }

    messageListElement.insertBefore(div, messageListNode);
  }

  return div;
}

// Displays a Message in the UI.
function displayMessage(id, timestamp, name, text, picUrl, imageUrl) {
  var div = document.getElementById(id) || createAndInsertMessage(id, timestamp);

  // profile picture
  if (picUrl) {
    div.querySelector('.pic').style.backgroundImage = 'url(' + addSizeToGoogleProfilePic(picUrl) + ')';
  }

  div.querySelector('.name').textContent = name;
  var messageElement = div.querySelector('.message');

  if (text) { // If the message is text.
    messageElement.textContent = text;
    // Replace all line breaks by <br>.
    messageElement.innerHTML = messageElement.innerHTML.replace(/\n/g, '<br>');
  } else if (imageUrl) { 
    // If the message is an image.
    var image = document.createElement('img');
    image.classList.add('img-responsive');
    image.addEventListener('load', function() {
      messageListElement.scrollTop = messageListElement.scrollHeight;
    });
    image.src = imageUrl + '&' + new Date().getTime();
    messageElement.innerHTML = '';
    messageElement.appendChild(image);
  }
  // fade transition
  setTimeout(function() {div.classList.add('visible')}, 1);
  messageListElement.scrollTop = messageListElement.scrollHeight;
  messageInputElement.focus();
}

// toggle send btn acc to auth status
function toggleButton() {
  if (messageInputElement.value) {
    submitButtonElement.removeAttribute('disabled');
    submitButtonElement.style.color = 'rgb(3,155,229)';
  } else {
    submitButtonElement.setAttribute('disabled', 'true');
    submitButtonElement.style.color = '';
  }
}


// init auth
initFirebaseAuth();

// TODO: Fbase performance monitor. Future Use..
firebase.performance();

// load msgs.
loadMessages();
