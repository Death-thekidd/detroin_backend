const { authJwt } = require("../middlewares");
const controller = require("../controllers/user.controller");
const config = require("../config/auth.config");
const cors = require("cors");
const db = require("../models");
const User = db.user;
const Role = db.role;
const Plan = db.plan;
const Wallet = db.wallet;

module.exports = function (app) {
	app.use(cors());
	app.use(function (req, res, next) {
		const origin = req.headers.origin;
		if (allowedOrigins.includes(origin)) {
			res.header("Access-Control-Allow-Origin", origin);
		}
		res.header(
			"Access-Control-Allow-Headers",
			"Origin, X-Requested-With, Content-Type, Accept"
		);
		next();
	});
	app.get("/api/test/all", controller.allAccess);

	app.get("/api/test/user", [authJwt.verifyToken], controller.userBoard);

	app.get(
		"/api/test/mod",
		[authJwt.verifyToken, authJwt.isModerator],
		controller.moderatorBoard
	);

	app.get(
		"/api/test/admin",
		[authJwt.verifyToken, authJwt.isAdmin],
		controller.adminBoard
	);

	app.get("/api/test/users", async (req, res) => {
		const users = await User.find({});
		res.json(users);
	});

	app.post("/api/test/deposit", async (req, res) => {
		const { username, amount, walletName } = req.body;

		const user = await User.findOne({ username });
		if (!user) return res.status(404).json({ message: "User not found" });

		user.wallets.map((wallet, index) => {
			if (wallet.name === walletName) {
				wallet.pending += amount;
			}
		});

		user.deposits.push({
			amount: amount,
			walletName: walletName,
			status: "pending",
		});
		await user.save();

		sendMail(
			"detroininvestments@gmail.com",
			"NEW DEPOSIT",
			`${username} just saved a deposit of $${amount}. Please review and approve`
		);
		sendMail(
			user.email,
			"DEPOSIT SAVED",
			`Hi, You just saved a new deposit of $${amount} and it is pending admin approval`
		);

		res.json({ message: "Deposit pending admin approval" });
	});

	app.post("/api/test/approve-deposit", async (req, res) => {
		const { username, userToApprove, depositId } = req.body;

		const admin = await User.findOne({ username });
		if (!admin || !admin.isAdmin)
			return res.status(403).json({ message: "Access denied" });

		const user = await User.findOne({ username: userToApprove });
		if (!user) return res.status(404).json({ message: "User not found" });

		const deposit = user.deposits.id(depositId);
		if (!deposit || deposit.status !== "pending")
			return res.status(400).json({ message: "Invalid deposit request" });

		user.balance += deposit.amount;
		user.wallets.map((wallet, index) => {
			if (wallet.name === deposit.walletName) {
				wallet.pending -= amount;
				wallet.balance += amount;
			}
		});
		user.totalDeposits += deposit.amount;
		user.activeDeposit = deposit.amount;
		deposit.status = "approved";
		deposit.approvedBy = admin.username;
		await user.save();
		sendMail(
			user.email,
			"DEPOSIT APPROVED",
			`Your deposit of $${deposit.amount} has been approved by our admins`
		);

		res.json({ message: "Deposit approved" });
	});

	app.post("/api/test/change-balance", async (req, res) => {
		const { username, userToChange, amount, type } = req.body;

		const admin = await User.findOne({ username });
		if (!admin || !admin.isAdmin)
			return res.status(403).json({ message: "Access denied" });

		const user = await User.findOne({ username: userToChange });
		if (!user) return res.status(404).json({ message: "User not found" });

		if (type === "increase") {
			user.balance += amount;
			user.totalEarnings += amount;
		} else {
			user.balance -= amount;
			user.totalEarnings -= amount;
		}
		user.earnings.push({
			amount: type === "increase" ? amount : -amount,
			status: "approved",
		});
		await user.save();

		res.json({ message: `${amount}` });
	});
	app.get("/api/test/plans", async (req, res) => {
		const plans = await Plan.find({});
		res.json(plans);
	});

	app.post("/api/test/change-plan", async (req, res) => {
		const { id, name, rate, min, max } = req.body;
		const existingPlan = await Plan.findOne({ id });
		if (existingPlan) {
			existingPlan.name = name;
			existingPlan.rate = rate;
			existingPlan.min = min;
			existingPlan.max = max;
			await existingPlan.save();
		} else {
			const plan = new Plan({
				id: id,
				name: name,
				rate: rate,
				min: min,
				max: max,
			});
			await plan.save();
		}
		res.json({ message: "Plan Updated Succesfully" });
	});

	app.get("/api/test/wallets", async (req, res) => {
		const wallets = await Wallet.find({});
		res.json(wallets);
	});

	app.post("/api/test/change-wallet", async (req, res) => {
		req.body.map(async (wallet, index) => {
			const _id = wallet["_id"];
			const existingWallet = await Wallet.findOne({ _id });
			if (existingWallet) {
				existingWallet.name = wallet?.name;
				existingWallet.address = wallet?.address;
				await existingWallet.save();
			} else {
				const newWallet = new Wallet({
					name: wallet?.name,
					address: wallet?.address,
				});
				await newWallet.save();
			}
		});
		res.json({ message: "Wallet Updated Succesfully" });
	});
};
