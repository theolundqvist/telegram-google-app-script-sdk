botUrl = "YOUR_TELEGRAM_API_URL"
adminId = "YOUR_TELEGRAM_CHAT_ID" //Use to send messages to yourself, find by setting WebHook and printing id in doPost()

//ALWAYS return htmlOK() from doPost
function htmlOK(){
  return HtmlService.createHtmlOutput('header("HTTP/1.1 200 OK");'); 
}

//FIRST THING TO DO
function setWebHook(){
  var url = "YOUR_SCRIPT_URL";
  var res = UrlFetchApp.fetch(botUrl+"/setWebhook?url="+url+"&allowed_updates=message").getContentText();
  print(res)
}

function webhookinfo(){
  var res = UrlFetchApp.fetch(botUrl+"/getWebhookInfo").getContentText();
  print(res)
}



//Your doPost should look something like this.

function doPost(e){
  let data = parseUpdate(e)  
   /* @returns one of the following
   * {type: "message", m: {}, id: "", message_text: ""}
   * {type: "callback", m: {}, id: "", button_text: "", message_text: "", name: "", message_id: ""}
   * {type: "inline_query", id: "", query: "", name: "", query_id: ""}*/
  
  print(data.id) //this is your userId/chatId. Send message to bot and save this as adminId to send messages to yourself.
  
  if(data.type == "message"){
    let text = data.message_text.toLowerCase()
    if(text == "hi") sendMessage(data.id, "hi")
  }

  return htmlOK()
}


/**
 * Message with buttons
 * @param {string=} id - User id
 * @param {string=} text - Message text
 * @param {array=} buttons - Button text or {text: "", url?: "", insert_in_chat?: ""}, array is rows and cols [[],[]], max one optional
 */
function sendMessage(id, text, buttons = [[]], notification=true){
  var url = botUrl + "/sendMessage?";
  
  return JSON.parse(fetch(url,{"chat_id":id, "text": text,disable_notification: !notification, "parse_mode":"HTML", "reply_markup": parseInlineKeyboard(buttons)})).result
}

/**
 * Photo with text
 * @param {string=} id - User id
 * @param {any=} img - url or file
 * @param {string=} text - image caption
 * @param {array=} buttons - Button text or {text: "", url?: "", insert_in_chat?: ""}, array is rows and cols, max one optional(?)
 */
function sendPhoto(id=adminId, img, text, buttons, notification=true){
  var url = botUrl + "/sendPhoto?"
  return JSON.parse(fetch(url, {chat_id:id, caption:text, disable_notification: !notification,photo: img, parse_mode:"HTML",reply_markup: parseInlineKeyboard(buttons)})).result
}


/**
 * Send buttons as a keyboard, most often better to use sendMessage with inline buttons than this.
 * @param {string=} id - User id
 * @param {string=} text - Message text
 * @param {array=} buttons - Button text
 */
function sendMultipleChoice(id=adminId, text="fråga", buttons=["1","2"], notification=true){
  var url = botUrl + "/sendMessage?";
  var keys = buttons.map(x => [{"text": x}])
  
  var keyboard = {
    "keyboard": keys,
    "one_time_keyboard": true,
    "resize_keyboard" : true
  };
  
  return JSON.parse(fetch(url,{"chat_id":id, "text": text, disable_notification: !notification, "parse_mode": "HTML", "reply_markup": JSON.stringify(keyboard)})).result
}



/**
 * used in sendMessage to parse buttons.
 * @buttons  array of arrays/array of strings or string
 */
function parseInlineKeyboard(buttons=[[{text:"buttontext", url: "url"}],
    [{text:"abc"}]]){
  if(!Array.isArray(buttons)) buttons = [[buttons]];
  if(!Array.isArray(buttons[0])) buttons = buttons.map(x => [x])
  //parse keys
  for(i in buttons){
    for(j in buttons[i]){
      let x = buttons[i][j]
      if(typeof x === 'string' || typeof x === 'number') buttons[i][j] = {text: x, callback_data: x}
      else if(Object.keys(x).length == 1 && x.text) buttons[i][j] = {text: x.text, callback_data: x.text}
      else if(typeof x.insert_in_chat === 'string'){
        buttons[i][j].switch_inline_query_current_chat = buttons[i][j].insert_in_chat
        delete buttons[i][j].insert_in_chat
        delete buttons[i][j].url
      }
    }
  }
  if(buttons){
    //print(JSON.stringify(buttons))
    return JSON.stringify({
      "inline_keyboard": buttons
    });
  }
  else return

}

/**
 * Remove buttons from message
 * @param {string=} id - User id
 * @param {string=} messageId - Message id
 */
async function removeMessageInline(id=adminId, messageId){
  var url = botUrl + "/editMessageReplyMarkup?";
    var keyboard = {
    "inline_keyboard": []
  };
  JSON.parse(fetch(url, {"chat_id": id, "message_id": messageId, "reply_markup": JSON.stringify(keyboard)})).result
}

/**
 * Update message buttons
 * @param {string=} id - User id
 * @param {string=} messageId - Message id
 */
async function editMessageKeyboard(id=adminId, messageId, buttons){
  var url = botUrl + "/editMessageReplyMarkup?";

  JSON.parse(fetch(url, {"chat_id": id, "message_id": messageId, "reply_markup": parseInlineKeyboard(buttons)})).result
}

/**
 * Update message photo
 */
function editMessageMedia(id, message, file_id){
  var url = botUrl + "/editMessageMedia?"
  //print(message.message_id)
  return JSON.parse(fetch(url, {chat_id:id, 
  message_id: message.message_id,
  parse_mode:"HTML", 
  reply_markup: JSON.stringify(message.reply_markup),
  media: JSON.stringify({type:"photo", media: file_id, caption: message.caption,
  caption_entities:message.caption_entities})
  })).result
}

/**
 * deletes message
 */
function deleteMessage(id, message){
  fetch(botUrl + "/deleteMessage?", {chat_id: id, message_id: message.message_id})
}




/**
 * make the bot go "typing ..."
 */
async function sendTypingAnimation(id){
  fetch(botUrl + "/sendChatAction?", {chat_id: id, action: "typing"})
}


/**
 * Answer inline query {query}
 * @param {string=} queryId
 * @param {array=} list - list of answers {body:, title:}
 * @param {string=} query
 */
function answerInlineQuery(queryId, list, query=""){

  for(i in list){
    list[i] = {
    type: "article", 
    id: i, 
    title: list[i].title, 
    input_message_content: {message_text: list[i].body}
    }
  }
  url = botUrl + "/answerInlineQuery?"

  fetch(url,{"inline_query_id":queryId, "results": JSON.stringify(list)})
}

/**
 * generate response object from bot update, 
 * types = ["message", "inline_query", "callback"]
 * @returns one of the following
 * {type: "message", m: {}, id: "", message_text: ""}
 * {type: "callback", m: {}, id: "", button_text: "", message_text: "", name: "", message_id: ""}
 * {type: "inline_query", id: "", query: "", name: "", query_id: ""}
 */
function parseUpdate(e = exampleData){
  var res = {}
  
  let update = JSON.parse(e.postData.contents)
  let callback = update.callback_query
  if(callback){
    res.type = "callback"
    res.m = callback.message
    res.id = callback.from.id.toString()
    
    res.button_text = callback.message.text
    res.message_text = res.m.text = callback.data
    
    res.name = callback.from.first_name + " " + callback.from.last_name
    res.message_id = callback.message.message_id
  }
  else if(update.inline_query){
    res.type = "inline_query"
    res.query = update.inline_query.query
    res.id = update.inline_query.from.id.toString()
    res.name = update.inline_query.from.first_name + update.inline_query.from.last_name
    res.query_id = update.inline_query.id
    
  }
  else {
    res.type = "message"
    res.m = update.message
    res.id = res.m.chat.id.toString()
    res.message_text = res.m.text
  }
  return res
}


/**
 * command	String -	Text of the command, 1-32 characters. Can contain only lowercase English letters, digits and underscores.
 * description	String -	Description of the command, 3-256 characters.
 */
function setMyCommands(){
  let a = fetch(botUrl + "/setMyCommands?", JSON.stringify([
  {command: "help", description: "text1"}, 
  {command: "search", description: "text2"},
  {command: "list", description: "text3"},
  {command: "settings", description: "text4"}]))

  print(a)
}




//FROM HERE ON DOWN IS JUST GENERIC HELPER METHODS




/**
 * @returns yyyy:mm:dd
 */
function getDate(offset = 0){
  let t = new Date()
  t.setDate(t.getDate() + offset);
  let m = t.getMonth()+1
  let d = t.getDate()
  return t.getFullYear() + "-" + ((m<10)?"0"+m:m) + "-" + ((d<10)?"0"+d:d)
}

/**
 * @returns h:m:s
 */
function getTime(){
  let t = new Date()
  let h = ("0"+(t.getUTCHours()+1)%24).slice(-2)
  let m = ("0"+t.getUTCMinutes()).slice(-2)
  let s = ("0"+t.getUTCSeconds()).slice(-2)
  return ([h,m,s].join(":"))
}

/**
 * start!/end!/time?=now must be "h:m:s"
 */
function withinTimeInterval(start="07:30:00", end="21:30:00", time="22:00:00"){
  s = start.split(":").map(x=>parseInt(x))
  e = end.split(":").map(x=>parseInt(x))
  t = (time || getTime()).split(":").map(x=>parseInt(x))
  for(i in s){
    if(t[i] < s[i] || t[i] > e[i]) return false
  }
  return true
}


function nextInt(min, max) {
  return Math.floor(Math.random() * (max - min) ) + min;
}




var isNumber = function isNumber(value) 
{
   return typeof value === "number" && isFinite(value);
}

function shuffle(a) {
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function print() {
  var text = ""
  for (var i = 0; i < arguments.length-1; i++) {
    text += arguments[i] + ", "
  }
  text += arguments[arguments.length-1]
  Logger.log(text)
}


function clip(str, start, end){
  let s = str.slice(str.indexOf(start) + start.length)
  return s.slice(0, s.indexOf(end))
}


function fetch(url, data=undefined, type){
  switch(type){
    case "html": type = "text/html"; break;
    case "json": type = "application/json"; data = JSON.stringify(data); break;
    case "form": type = "multipart/form-data"; break;
  }
  var options = {
    method: (data) ? "POST" : "GET", 
    contentType:type,
    payload: data
  }
  //var request = UrlFetchApp.getRequest(url,options);   // (OPTIONAL) generate the request so you
  //log("Request payload: " + request.payload); 
  var response = UrlFetchApp.fetch(url,options);
  //log(response.getContentText());
  return response.getContentText()
}


async function log(text, GoogleSheetForLogging){
  GoogleSheetForLogging.insertRowBefore(1).getRange(1, 1, 1, 2).setValues([[getDate() +" "+ getTime(), text]]);
}

async function runAsync(func, arguments){
  func(arguments)
}


timeFunc = (func, query) => {
  let t = new Date().getTime()
  let r = func(query)
  return {t: new Date().getTime()-t, value: r}
}
