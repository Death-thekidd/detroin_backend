const { verifySignUp } = require("../middlewares");
const controller = require("../controllers/auth.controller");

module.exports = function (app) {
	app.post(
		"/api/auth/signup",
		[
			verifySignUp.checkDuplicateUsernameOrEmail,
			verifySignUp.checkRolesExisted,
		],
		(req, res) => {
			controller.signup(req, res);
		}
	);

	app.post("/api/auth/signin", (req, res) => {
		console.log("Signin route hit"); // Add a log statement here
		controller.signin(req, res);
	});

	app.post("/api/auth/signout", controller.signout);
};
