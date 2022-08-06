
window.onload = () => {
  askNotificationPermission();
  let { username, roomkey, autoenter } = getLocalValues();
  if (!!username && !!roomkey && autoenter === 'true') {
    startChat(username, roomkey);
  } else {
    showLoginBox(username, roomkey, autoenter === 'true');
  }

};

var gUserName = '';
var gOther = '';
var gKey = '';
var gNotification : any = null;
var gEnableNotificationTimer : any = 0;
function startChat(username: string, key: string) {
  let element = document.getElementById('mainBox');
  element && (element.style.display = 'block');
  gUserName = username;
  gKey = key;
  connect();
  let input = document.getElementById('chatbox');
  input && input.addEventListener("keypress", function(event) {
    if (event.key === "Enter") {
      event.preventDefault();
      document && document?.getElementById("sendBtn")?.click();
    }
  });
  setInfoText(`room key: ${gKey}`, 'info');
}

function createElementWithAttributes(tag: string, attrs: any, value: string | boolean) {
  let ret = document.createElement(tag)
  Object.keys(attrs).forEach( key => ret.setAttribute(key, attrs[key]));
  value && ((ret as any).value = value);
  return ret;
}

function showLoginBox(username: string | null, roomkey: string | null, autoenter: boolean) {
  let box = document.getElementById('loginBox');
  if (!box) return;
  username ??= '';
  roomkey ??= '';
  let usernameInput = createElementWithAttributes('input', { type: 'text', id: 'usernameInput'}, username);
  (usernameInput as HTMLInputElement).placeholder = 'Username';
  let roomkeyInput = createElementWithAttributes('input', { type: 'text', id: 'keyInput'}, roomkey);
  (roomkeyInput as HTMLInputElement).placeholder = 'room key';
  let autoenterInput = createElementWithAttributes('input', { type: 'checkbox', id: 'autoInput'}, autoenter);
  (autoenterInput as HTMLInputElement).checked = !!autoenter;

  let enterButton = createElementWithAttributes('button', { id: 'enterBtn'}, '');
  enterButton.innerText = 'enter';
  enterButton.addEventListener('click', () => {
    let username = (document?.getElementById('usernameInput') as HTMLInputElement).value;
    let roomkey = (document?.getElementById('keyInput') as HTMLInputElement).value;
    let autoenter = (document?.getElementById('autoInput') as HTMLInputElement).checked;
    console.log('saving', username, roomkey, autoenter);
    if (!!username && !!roomkey) {
      box && (box.style.display = 'none');
      window.localStorage.setItem('username', username);
      window.localStorage.setItem('key', roomkey);
      window.localStorage.setItem('autoenter', (autoenter + ''));
      startChat(username, roomkey);
    }
  })

  box.appendChild(usernameInput);
  box.appendChild(roomkeyInput);
  box.appendChild(autoenterInput);
  box.appendChild(enterButton);
  box.style.display = 'block';
}

function getLocalValues() {
  let username = window.localStorage.getItem('username');
  let roomkey = window.localStorage.getItem('key');
  let autoenter = window.localStorage.getItem('autoenter');
  return { username, roomkey, autoenter};
}

function onClick(evt: Event) {
  let textBox = <HTMLInputElement>document.getElementById('chatbox');
  let text = textBox.value;
  if (!!text) {
    setUserMessageText(text, gUserName);
    textBox.value = '';
    sock.send(JSON.stringify({msg: text, name: gUserName}));
    imLastSpeaker = true;
  }
}

function setInfoText(text: string, type = 'info') {
  let messageBox = document.getElementById('messageBox');
  let newLine = createElementWithAttributes('div', {class: type}, '');
  newLine.innerText = text;
  messageBox?.appendChild(newLine);
}

function setUserMessageText(text: string, name: string) {
  let messageBox = document.getElementById('messageBox');
  if (!messageBox) return;
  let me = name === gUserName;
  if (me && (imLastSpeaker === null || !imLastSpeaker)) {
    let newLine = createElementWithAttributes('div', { class: 'me title' }, '');
    newLine.innerText = 'you:';
    messageBox.appendChild(newLine);
  } else if (!me && (imLastSpeaker === null || imLastSpeaker)) {
    let newLine = createElementWithAttributes('div', { class: 'other title' }, '');
    newLine.innerText = name + ':';
    messageBox.appendChild(newLine);
  }

  let newLine = createElementWithAttributes('div', { class: me ? 'me' : 'other' }, '');
  newLine.innerText = text;
  messageBox.appendChild(newLine);

  messageBox.scrollTop = messageBox.scrollHeight;
  // let nextLine = '\n';
  // if (imLastSpeacker !== me) nextLine = nextLine + '\n';
  // messageBox.value += nextLine + text;
}

var sock : WebSocket;
var imLastSpeaker : boolean = false;
var timeout: string | number | NodeJS.Timer | null | undefined = null;
var timeout2: string | number | NodeJS.Timer | null | undefined = null;
var isWindowFocused : boolean = true;

function connect() {
  var host = location.origin.replace(/^http/, 'ws');
  sock = new WebSocket(host);
  //sock = new WebSocket('wss://gaeun-chat.herokuapp.com');
  //sock = new WebSocket('wss://127.0.0.1:5000');
  sock.onopen = (evt) => {
    console.log(evt);
    window.addEventListener('focus', (evt: Event) => {
      isWindowFocused = true;
      // console.log('isWindowFocused', isWindowFocused);
    })
    window.addEventListener('blur', (evt: Event) => {
      isWindowFocused = false;
      // console.log('isWindowFocused', isWindowFocused);
    })
    sock.send(JSON.stringify({ key: gKey, name: gUserName }));
    timeout2 = setInterval(() => {
      try {
        console.log('tick with fetch');
        fetch('https://gaeun-chat.herokuapp.com')
        .then( (res) => console.log('fetch complete'))
        .catch( e => console.log(e) );
      } catch (e) {
        clearTimeout(<number>timeout2);
      }
    }, (25 * 60 * 1000));
    timeout = setInterval(() => {
      try {
        console.log('tick!');
        sock.send(JSON.stringify({'tick':gUserName}));
      } catch (e) {
        clearTimeout(<number>timeout);
      }
    }, (30 * 1000));
  };

  sock.onclose = (evt) => {
    setInfoText('connection closed', 'error');
  }
  sock.onmessage = (evt) => {
    try {
      let payload = JSON.parse(evt.data);
      console.log(payload);
      let msg = payload.msg;
      if (!!msg) {
        if (isWindowFocused === false) {
          if (!gNotification) {
            gNotification = new Notification('New Message'/*, { body: text, icon: img }*/);
            gNotification.onclick = () => {
              window.focus();
              gNotification = null;
              gEnableNotificationTimer && clearTimeout(gEnableNotificationTimer);
              gEnableNotificationTimer = 0;
            }
            if (!gEnableNotificationTimer) {
              gEnableNotificationTimer = setTimeout( () => {
                console.log('clear notification timeout');
                gNotification && gNotification.close();
                gNotification = null;
                gEnableNotificationTimer = 0;
              }, 10000)
            }
          }
        }
        setUserMessageText(msg, payload.name);
        imLastSpeaker = false;
      }
      if (!!payload.status) {
        let { connectionCnt, name } = payload;
        setInfoText(`'${name}' is connected, current users: ${connectionCnt}`, 'info');
      }
      if (!!payload.error) {
        setInfoText(`${payload.error}`, 'error');
      }
    } catch (e) {
      console.log(e);
    }
  };
}

function askNotificationPermission() {
  // Let's check if the browser supports notifications
  if (!('Notification' in window)) {
    console.log("This browser does not support notifications.");
  } else {
    if(checkNotificationPromise()) {
      Notification.requestPermission()
      .then((permission) => {
        console.log(permission);
      })
    } else {
      Notification.requestPermission(function(permission) {
        console.log(permission);
      });
    }
  }
}
function checkNotificationPromise() {
  try {
    Notification.requestPermission().then();
  } catch(e) {
    return false;
  }

  return true;
}