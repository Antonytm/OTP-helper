// ==UserScript==
// @name        OTP Helpers
// @description Provides button to automatically fill OTP code. Developed by Alex Povar.
// @author      Alex Povar
// @downloadURL https://raw.githubusercontent.com/Zvirja/OTP-helper/master/otp-helper.user.js
// @include     https://sitecore.onelogin.com/login
// @namespace   https://github.com/Zvirja/OTP-helper
// @grant       GM_getValue
// @grant       GM_setValue
// @require     https://crypto-js.googlecode.com/files/2.3.0-crypto-sha1-hmac.js
// @require     http://www.tumuski.com/library/Nibbler/Nibbler.js
// @require     https://rawgit.com/adulau/hotp-js/master/hotp/hotp.js
// @version     1.0.1
// ==/UserScript==



var pageScript = function() {
  var $ = jQuery;
  var SEND_BUTTON_TEXT = "SEND OTP CODE";
  
  
  $(document).ready(function() {
    
    //ADD CONFIGURATION BUTTON
    
    var configureBtn = $('<button id="ConfigureOTPHelper">CONFIGURE OTP HELPER</button>').css({
      position: "absolute",
      top: 0,
      right: 0,
      margin: "10px"
    });
    
    configureBtn.click(function() {
      var currentConfig = OTP_HELPER_getConfig();
      var currentValue = "";
      if(currentConfig) {
        currentValue = `${currentConfig.credentialID}|${currentConfig.sharedSecret}`; 
      }
      
      var rawValue = prompt("Enter new OTP parameters.\nInput format: CREDENTIAL_ID|SHARED_SECRET", currentValue);
      if(rawValue) {
        var pair = rawValue.split("|");
        if(pair.length !== 2) {
          return; 
        }
        
        OTP_HELPER_setConfig(pair[0], pair[1]);
      }
      
      return false;
    });
    
    $(document.body).append(configureBtn);
    
    
    //ADD SEND_BUTTON at the moment when spinner appears
    
    var originalSpinInit = Application.Helpers.Spin.initialize;
    Application.Helpers.Spin.initialize = function() {
      var config = OTP_HELPER_getConfig();
      if(config != null) {
        var container = $("fieldset.buttons > ol");
        container.append(`<li><button>${SEND_BUTTON_TEXT}</button></li>`);
        
      var button = $("button", container);
        
      button.click(function() {
        try {
          var otp = OTP_HELPER_getOTP(config);
            
          button.text("SENDING...");
            
          $.ajax(`https://app.onelogin.com/otp_auto_token/receive_token/${config.credentialID}/${otp}`)
           .then(function() {
             var btnLabel = button.text();
             button.text("SENT!");
             setTimeout(_ => button.text(SEND_BUTTON_TEXT), 1000);
           })
           .fail(function(_, status, err) {
             console.error(err);
             button.text("ERROR! CHECK CONSOLE FOR MORE DETAIL");
             setTimeout(_ => button.text(SEND_BUTTON_TEXT), 3000);
           });
            
        } catch(e) {
          button.text("ERROR IN SCRIPT! CHECK CONSOLE FOR MORE DETAIL");
          setTimeout(_ => button.text(SEND_BUTTON_TEXT), 3000);
        }
          
          
        return false;
      });
                                   
    }
                         
    originalSpinInit.call(this);
  }
    
  });
};



/* PRIVILEGED API EXPORT */

exportFunction(function() {
  var value = GM_getValue("config");
  if(value) {
    return JSON.parse(value);
  }
  
  return null;
}, unsafeWindow, { defineAs: "OTP_HELPER_getConfig" });

exportFunction(function(credentialID, sharedSecret) {
  GM_setValue("config", JSON.stringify({
    credentialID: credentialID,
    sharedSecret: sharedSecret
  }));
}, unsafeWindow, { defineAs: "OTP_HELPER_setConfig" });

exportFunction(function(config) {
  /* Function that calculates OTP */
  var interval = 30;
  var timestamp = Math.round((new Date()).getTime() / 1000);
  var timecode = Math.floor((timestamp * 1000) / (interval * 1000));
  
  return hotp(base32_to_hex(config.sharedSecret), timecode, "dec6");  
}, unsafeWindow, { defineAs: "OTP_HELPER_getOTP" });


/* INJECT SCRIPT TO PAGE */

var scriptElem = document.createElement("script");
scriptElem.type = "text/javascript";
scriptElem.id = "OTP Helpers";
scriptElem.appendChild(document.createTextNode("(" + pageScript.toString() + ")()"));

setTimeout(function() {
  document.head.appendChild(scriptElem);
  scriptElem.remove();
}, 0);


/* HELPER FUNCTIONS */

function base32_to_hex(s) {
  var base32_8bit = new Nibbler({
    dataBits: 8,
    codeBits: 5,
    keyString: "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567",
    pad: '='
  });
  var decoded = base32_8bit.decode(s);
  var decoded_byte_array = Crypto.charenc.Binary.stringToBytes(decoded);
  var decoded_hex = Crypto.util.bytesToHex(decoded_byte_array);
  return decoded_hex;
}
