const db = require("../models");
const ROLES = db.ROLES;
const User = db.user;

checkDuplicateUsernameOrEmail = async (req, res, next) => {
	try {
		const user = await User.findOne({
			username: req.body.username,
		}).exec();

		if (user) {
			res.status(400).send({ message: "Failed! Username is already in use!" });
			return;
		}

		const email = await User.findOne({
			email: req.body.email,
		}).exec();

		if (email) {
			res.status(400).send({ message: "Failed! Email is already in use!" });
			return;
		}

		next();
	} catch (error) {
		res.status(500).send({ message: error });
		return;
	}
};

const checkRolesExisted = (req, res, next) => {
	if (req.body.roles) {
		const invalidRole = req.body.roles.some((role) => !ROLES.includes(role));

		if (invalidRole) {
			res.status(400).send({
				message: `Failed! Role ${invalidRole} does not exist!`,
			});
			return;
		}
	}

	next();
};

const verifySignUp = {
	checkDuplicateUsernameOrEmail,
	checkRolesExisted,
};

module.exports = verifySignUp;
