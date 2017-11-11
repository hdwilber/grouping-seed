import nodemailer from 'nodemailer'

const { 
  SERVER_URL,
  MAILER_HOST,
  MAILER_PORT,
  MAILER_AUTH_USER,
  MAILER_AUTH_PASS,
  MAILER_AUTH_DISPLAYNAME,
} = process.env

const transporter = nodemailer.createTransport({
    host: MAILER_HOST,
    port: parseInt(MAILER_PORT),
    secure: true,
    auth: {
        user: MAILER_AUTH_USER,
        pass: MAILER_AUTH_PASS
    },
    tls: {
        ciphers:'SSLv3'
    }
})

const mailOptions = {
  from: `${MAILER_AUTH_USER}`, 
  subject: '✔ You have been invited to be part of ', 
}

export function sendInvitationByEmail (invitation) {
  return new Promise ( (resolve, reject) => {
    transporter.verify(function(error, success) {
      if (error) {
        reject(error);
      } else {
        const email = {
          ...mailOptions,
          to: `${invitation.recipientEmail}, ${MAILER_AUTH_USER}`, 
          html: `<b>You were invited to join with us: </b><a href="${SERVER_URL}/Invitations/${invitation.verificationCode}" target="_blank" > Click here</a>`
        };
        transporter.sendMail(email, (error, info) => {
          if (!error) {
            resolve(email);
          } else {
            reject(error)
          }
        })
      }
    })
  })
}
