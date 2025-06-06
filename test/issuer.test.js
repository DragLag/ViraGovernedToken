const { deployProxy } = require('@openzeppelin/truffle-upgrades');
const ViraGovernedToken = artifacts.require("ViraGovernedToken");

contract("ViraGovernedToken issuer", accounts => {
  const [owner, issuer, issuer1, user2, user1] = accounts;

  let contract;

  beforeEach(async () => {
    contract = await deployProxy(ViraGovernedToken, [], {
      initializer: 'initialize',
      from: owner
    });

    await contract.addIssuer(issuer, { from: owner });
    //console.log(contract.authorizedIssuers)
  });

  it("should register users", async () => {
    const balance1 = await contract.balanceOf(user1);
    assert.equal(balance1.toString(), "0");
  });

  it("should add issuer successfully by owner", async () => {
      // Act
      await contract.addIssuer(issuer1, { from: owner });
      
      // Assert
      const isAuthorized = await contract.authorizedIssuers(issuer1);
      assert.equal(isAuthorized, true, "Issuer should be authorized");
    });
    

  it("should modify users' balance", async () => {
    await contract.adjustBalance(user1, 1000, { from: issuer });
    const balance1 = await contract.balanceOf(user1);
    assert.equal(balance1.toString(), "1000");
  });

  it("should allow multiple balance adjustments by authorized issuer", async () => {
    //await contract.addIssuer(issuer1, { from: owner });
      // Act
      await contract.adjustBalance(user1, 1000, { from: issuer });
      await contract.adjustBalance(user2, 2000, { from: issuer });
      
      // Assert
      const balance1 = await contract.balanceOf(user1);
      const balance2 = await contract.balanceOf(user2);
      assert.equal(balance1.toString(), "1000", "User1 balance should be 1000");
      assert.equal(balance2.toString(), "2000", "User2 balance should be 2000");
    });  

  
});
