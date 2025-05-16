const nodemailer = require("nodemailer")
const configkey  = require ('../../config/config.js')
const listkey = configkey.access
const path = require('path')


async function sendByGmail(mailName, mailEmail, mailMessage, attachedPath) {

  const transporter = nodemailer.createTransport({
    service: "Gmail",
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: listkey.mailuser,
      pass: listkey.mailpass,
    },
  });

  let mailOptions
  let succesMsg

  if (attachedPath == 'Support') {
    const mailSubject = 'Support Logfly '+store.get('version')+' '+store.get('currOS')+' '+store.get('osVersion')
    succesMsg = 'We will get back to you as soon as possible'
    mailOptions = {
        from: listkey.mailuser,
        to: listkey.mailuser,
        replyTo : mailEmail,
        subject: mailSubject,
        text: mailMessage,
    }
  } else {
    const nameFile = path.basename(attachedPath)
    const mailSubject = 'Logfly export'
    succesMsg = nameFile+' has been sent'
    mailOptions = {
        from: listkey.mailuser,
        to: mailEmail,
        subject: mailSubject,
       // text: mailMessage,
        text: `${mailMessage}\n\nAttached file: ${nameFile}`, 
        attachments: [
            {
                filename: nameFile,
                path: attachedPath, 
            },
        ],
    } 
  }

  const info = await transporter.sendMail(mailOptions)
  
  return info
}

module.exports.sendByGmail = sendByGmail