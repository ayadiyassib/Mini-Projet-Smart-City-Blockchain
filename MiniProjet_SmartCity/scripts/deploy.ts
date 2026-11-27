import { network } from "hardhat";

async function main() {
  console.log("------------------------------------------------------------");
  console.log("Deploiement du Smart Contract UrbanIssueRegistry (Smart City)...");

  // Connexion officielle Hardhat 3
  const connection = await network.create();
  const { ethers } = connection;

  const [municipality] = await ethers.getSigners();
  console.log("Compte Autorite Municipale (Admin) :", municipality.address);

  // Deploiement du registre urbain
  const Factory = await ethers.getContractFactory("UrbanIssueRegistry");
  const registry = await Factory.deploy();
  await registry.waitForDeployment();

  const contractAddress = await registry.getAddress();
  console.log("============================================================");
  console.log("✅ UrbanIssueRegistry deploye avec succes a l'adresse :");
  console.log(contractAddress);
  console.log("============================================================");
}

main().catch((error) => {
  console.error("Erreur deploiement :", error);
  process.exitCode = 1;
});