const { authJwt } = require("../middlewares");
const controller = require("../controllers/user.controller");
const config = require("../config/auth.config");
const db = require("../models");
const sendMail = require("../sendMail");
const User = db.user;
const Role = db.role;
const Plan = db.plan;
const Wallet = db.wallet;

module.exports = function (app) {
	app.get("/api/test/all", controller.allAccess);

	app.get("/api/test/user/:id", controller.userBoard);

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
		res.status(200).json(users);
	});

	app.post("/api/test/deposit", async (req, res) => {
		const { username, amount, walletName, plan } = req.body;

		const user = await User.findOne({ username });
		if (!user) return res.status(404).json({ message: "User not found" });

		user.wallets.map((wallet, index) => {
			if (wallet.name === walletName) {
				wallet.pending += amount;
			}
		});

		console.log(plan);

		user.deposits.push({
			amount: amount,
			walletName: walletName,
			plan: plan,
			status: "pending",
		});
		await user.save();

		sendMail(
			"detroininvestment72@gmail.com",
			"NEW DEPOSIT",
			`${username} just saved a deposit of $${amount}. Please review and approve`
		);
		sendMail(
			user.email,
			"DEPOSIT SAVED",
			`Hi, You just saved a new deposit of $${amount} and it is pending admin approval`
		);

		res.status(201).json({ message: "Deposit pending admin approval" });
	});
	app.post("/api/test/withdraw", async (req, res) => {
		const { username, amount, walletName } = req.body;

		const user = await User.findOne({ username });
		if (!user) return res.status(404).json({ message: "User not found" });

		user.wallets.map((wallet, index) => {
			if (wallet.name === walletName) {
				wallet.pending -= amount;
			}
		});

		user.withdrawals.push({
			amount: amount,
			walletName: walletName,
			status: "pending",
		});
		await user.save();

		sendMail(
			"detroininvestment72@gmail.com",
			"NEW WITHDRAWAL",
			`${username} just requested a withdrawal of $${amount}. Please review and approve`
		);
		sendMail(
			user.email,
			"WITHDRAWAL SAVED",
			`Hi, You just saved a new withdrawal of $${amount} and it is pending admin approval`
		);

		res.status(201).json({ message: "Withdrawal pending admin approval" });
	});

	app.post("/api/test/approve-withdrawal", async (req, res) => {
		const { username, userToApprove, withdrawalId } = req.body;

		const admin = await User.findOne({ username });
		if (!admin || !admin.isAdmin)
			return res.status(403).json({ message: "Access denied" });

		const user = await User.findOne({ username: userToApprove });
		if (!user) return res.status(404).json({ message: "User not found" });

		const withdrawal = user.withdrawals.id(withdrawalId);
		if (!withdrawal || withdrawal.status !== "pending")
			return res.status(400).json({ message: "Invalid withdrawal request" });

		user.balance -= withdrawal.amount;
		user.wallets.map((wallet, index) => {
			if (wallet.name === withdrawal.walletName) {
				wallet.pending += withdrawal.amount;
				wallet.balance -= withdrawal.amount;
			}
		});
		withdrawal.status = "approved";
		withdrawal.approvedBy = admin.username;
		await user.save();
		sendMail(
			user.email,
			"WITHDRAWAL APPROVED",
			`Your dwithdrawal of $${withdrawal.amount} has been approved by our admins`
		);

		res.status(200).json({ message: "Withdrawal approved" });
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
				wallet.pending -= deposit.amount;
				wallet.available += deposit.amount;
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

		res.status(200).json({ message: "Deposit approved" });
	});

	app.use("/api/test/add-profit", async (req, res) => {
		try {
			const users = await User.find({});
			users?.map((user) => {
				user?.deposits?.map(async (deposit) => {
					console.log(deposit?.plan, deposit?.status, user.username);
					if (deposit?.status === "approved" && deposit?.plan) {
						console.log("Hmm");
						const plan = await Plan.findOne({ id: deposit.plan });
						const profit = (Number(plan?.rate) / 100) * Number(deposit?.amount);
						user.balance = user.balance + profit;
						user?.wallets?.map((wallet) => {
							if (wallet?.name === deposit?.walletName) {
								wallet.available += profit;
							}
						});
						await user.save();
					}
				});
			});
		} catch (error) {
			console.log(error);
			return res.status(500).json({ message: "Internal Server Error" });
		}
		console.log("Yea");
		res.status(200).json({ message: "Job executed" });
	});

	app.post("/api/test/update-user", async (req, res) => {
		const updatedUserData = req.body;
		try {
			const updatedUser = await User.findOneAndUpdate(
				{ _id: updatedUserData._id }, // Replace with the appropriate unique identifier
				{ $set: updatedUserData }, // Use $set to update all fields in the user document
				{ new: true } // Set new: true to return the updated user object
			);
			if (!updatedUser) {
				return res.status(404).json({ message: "User not found" });
			}
			return res.status(200).json({ data: updatedUser });
		} catch (error) {
			return res.status(500).json({ message: "Internal Server Error" });
		}
	});

	app.post("/api/test/request-withdrawal", async (req, res) => {});

	app.post("/api/test/change-balance", async (req, res) => {
		const { username, userToChange, amount, type, walletName } = req.body;

		const admin = await User.findOne({ username });
		if (!admin || !admin.isAdmin)
			return res.status(403).json({ message: "Access denied" });

		const user = await User.findOne({ username: userToChange });
		if (!user) return res.status(404).json({ message: "User not found" });

		user.wallets.map((wallet) => {
			if (wallet.name === walletName) {
				if (type === "increase") {
					wallet.balance += amount;
				} else {
					wallet.balance -= amount;
				}
			}
		});

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

		res.status(204).json({ message: `${amount}` });
	});
	app.get("/api/test/plans", async (req, res) => {
		const plans = await Plan.find({});
		res.status(200).json(plans);
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
		res.status(204).json({ message: "Plan Updated Succesfully" });
	});

	app.get("/api/test/wallets", async (req, res) => {
		const wallets = await Wallet.find({});
		res.status(200).json(wallets);
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
		res.status(204).json({ message: "Wallet Updated Succesfully" });
	});
};
