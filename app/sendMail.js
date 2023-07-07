const nodemailer = require("nodemailer");

const dotenv = require("dotenv");

dotenv.config();

const { google } = require("googleapis");

const OAuth2 = google.auth.OAuth2;

const createTransporter = async () => {
	// 1
	// const oauth2Client = new OAuth2(
	// 	process.env.OAUTH_CLIENT_ID,
	// 	process.env.OAUTH_CLIENT_SECRET,
	// 	"https://developers.google.com/oauthplayground"
	// );

	// // 2
	// oauth2Client.setCredentials({
	// 	refresh_token: process.env.OAUTH_REFRESH_TOKEN,
	// });

	// const accessToken = await new Promise((resolve, reject) => {
	// 	oauth2Client.getAccessToken((err, token) => {
	// 		if (err) {
	// 			reject("Failed to create access token :( " + err);
	// 		}
	// 		resolve(token);
	// 	});
	// });

	// 3
	// const transporter = nodemailer.createTransport({
	// 	service: "gmail",
	// 	auth: {
	// 		type: "OAuth2",
	// 		user: process.env.SENDER_EMAIL,
	// 		accessToken,
	// 		clientId: process.env.OAUTH_CLIENT_ID,
	// 		clientSecret: process.env.OAUTH_CLIENT_SECRET,
	// 		refreshToken: process.env.OAUTH_REFRESH_TOKEN,
	// 	},
	// });

	const transporter = nodemailer.createTransport({
		host: "smtp-relay.sendinblue.com",
		port: 465,
		auth: {
			user: process.env.SENDER_EMAIL,
			pass: process.env.SENDER_PASS,
		},
	});

	// 4
	return transporter;
};

async function sendMail(to, subject, text) {
	let mailOptions = {
		from: process.env.SENDER_EMAIL, // sender address
		to: to, // list of receivers
		subject: subject, // Subject line
		text: text, // plain text body
	};

	console.log(mailOptions);

	try {
		// Get response from the createTransport
		let emailTransporter = await createTransporter();

		// Send email
		await new Promise((resolve, reject) => {
			emailTransporter.sendMail(mailOptions, function (error, info) {
				if (error) {
					// failed block
					console.log(error);
					reject(error);
				} else {
					// Success block
					console.log("Email sent: " + info.response);
					resolve(info);
				}
			});
		});
	} catch (error) {
		return console.log(error);
	}
}

module.exports = sendMail;
