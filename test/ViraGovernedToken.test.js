const ViraGovernedToken = artifacts.require("ViraGovernedToken");

contract("ViraGovernedToken", (accounts) => {
  const [owner, operator, user1, user2, user3, richUser] = accounts;
  let token;

  beforeEach(async () => {
    token = await ViraGovernedToken.new({ from: owner });
    await token.addOperator(operator, { from: owner });
  });

  it("Register new users with 100 tokens", async () => {
    await token.registerUser(user1, { from: operator });
    const balance = await token.balanceOf(user1);
    console.log("User1 Balance:", balance.toString());
    assert(balance.toString() === "100");
  });

  it("Block and unblock a user", async () => {
    await token.registerUser(user2, { from: operator });
    await token.blockUser(user2, { from: operator });

    try {
      await token.transfer(user1, 10, { from: user2 });
      assert(false); // Non dovrebbe mai arrivare qui
    } catch (e) {
      assert(e.message.includes("Sender is blocked"));
    }

    await token.unblockUser(user2, { from: operator });
    await token.transfer(user1, 10, { from: user2 });
    const balance = await token.balanceOf(user1);
    assert(balance.toString() === "10");
  });

  it("Adjust a user's balance", async () => {
    await token.registerUser(user3, { from: operator });
    await token.adjustBalance(user3, 50, { from: operator }); // Aggiungi 50
    let balance = await token.balanceOf(user3);
    assert(balance.toString() === "150");

    await token.adjustBalance(user3, -30, { from: operator }); // Rimuovi 30
    balance = await token.balanceOf(user3);
    assert(balance.toString() === "120");
  });

  it("RRedistributes capital from a rich user to poor users", async () => {
    await token.registerUser(user1, { from: operator });
    await token.registerUser(user2, { from: operator });
    await token.registerUser(richUser, { from: operator });

    // Aggiungiamo un po' di ricchezza extra
    await token.adjustBalance(richUser, 900, { from: operator }); // Totale 1000

    await token.redistribute(richUser, { from: operator });

    const balance1 = await token.balanceOf(user1);
    const balance2 = await token.balanceOf(user2);
    const balanceRich = await token.balanceOf(richUser);

    console.log("User1:", balance1.toString());
    console.log("User2:", balance2.toString());
    console.log("Rich User (post):", balanceRich.toString());

    // Il ricco deve avere saldo pari alla media finale
    const total = (
      parseInt(balance1.toString()) +
      parseInt(balance2.toString()) +
      parseInt(balanceRich.toString())
    );
    const average = Math.floor(total / 3);

    assert(balanceRich.toString() === average.toString());
  });
});
