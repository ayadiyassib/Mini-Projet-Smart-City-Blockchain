import { expect } from "chai";
import { network } from "hardhat";

describe("UrbanIssueRegistry - Tests Unitaires & Cycle de Vie Smart City", function () {
  let ethers: any;
  let registry: any;
  let municipality: any;
  let citizen: any;
  let unauthorizedUser: any;

  // Initialisation de la connexion Hardhat 3
  before(async function () {
    const connection = await network.create();
    ethers = connection.ethers;
  });

  // Déploiement d'un contrat neuf avant chaque test
  beforeEach(async function () {
    [municipality, citizen, unauthorizedUser] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("UrbanIssueRegistry");
    registry = await Factory.deploy();
    await registry.waitForDeployment();
  });

  // -------------------------------------------------------------
  // TEST 1 : Déclaration d'un signalement par un citoyen
  // -------------------------------------------------------------
  it("1. Un citoyen peut déclarer un signalement (statut initial = Reported)", async function () {
    const tx = await registry.connect(citizen).reportIssue(
      "CITY-2026-001",
      "StreetLight",
      "Avenue Mohammed V",
      "Lampadaire éteint depuis hier soir",
      "2026-11-19",
      "High"
    );
    await tx.wait();

    expect(await registry.getTotalIssues()).to.equal(1);

    const issue = await registry.getIssue(1);
    expect(issue.issueCode).to.equal("CITY-2026-001");
    expect(issue.issueType).to.equal("StreetLight");
    expect(issue.reporter).to.equal(citizen.address);
    expect(issue.status).to.equal(0); // 0 = Reported

    // Vérification de l'historique initial
    const history = await registry.getIssueHistory(1);
    expect(history.length).to.equal(1);
    expect(history[0].comment).to.equal("Signalement declare par le citoyen");
    expect(history[0].actor).to.equal(citizen.address);
  });

  // -------------------------------------------------------------
  // TEST 2 : Affectation d'une équipe par la municipalité
  // -------------------------------------------------------------
  it("2. La municipalité peut affecter une équipe (statut passe à Assigned)", async function () {
    await registry.connect(citizen).reportIssue(
      "CITY-2026-001",
      "StreetLight",
      "Avenue Mohammed V",
      "Panne d'éclairage",
      "2026-11-19",
      "High"
    );

    // La municipalité affecte UrbanTeam01
    await registry.connect(municipality).assignTeam(1, "UrbanTeam01", "Équipe dépêchée sur place");

    const issue = await registry.getIssue(1);
    expect(issue.assignedTo).to.equal("UrbanTeam01");
    expect(issue.status).to.equal(1); // 1 = Assigned

    // L'historique doit comporter 2 étapes
    const history = await registry.getIssueHistory(1);
    expect(history.length).to.equal(2);
    expect(history[1].assignedTo).to.equal("UrbanTeam01");
    expect(history[1].comment).to.equal("Équipe dépêchée sur place");
  });

  // -------------------------------------------------------------
  // TEST 3 : Sécurité & Contrôle d'accès
  // -------------------------------------------------------------
  it("3. Sécurité : Un utilisateur non autorisé ne peut pas affecter ni modifier le statut", async function () {
    await registry.connect(citizen).reportIssue(
      "CITY-2026-001",
      "StreetLight",
      "Avenue Mohammed V",
      "Panne",
      "2026-11-19",
      "Medium"
    );

    // Tentative frauduleuse d'affectation
    await expect(
      registry.connect(unauthorizedUser).assignTeam(1, "FakeTeam", "Tentative pirate")
    ).to.be.revertedWith("Erreur: Action reservee aux services municipaux");

    // Tentative frauduleuse de clôture
    await expect(
      registry.connect(unauthorizedUser).updateStatus(1, 4, "Clôture illégitime")
    ).to.be.revertedWith("Erreur: Action reservee aux services municipaux");
  });

  // -------------------------------------------------------------
  // TEST 4 : Traçabilité du Cycle Complet (InProgress -> Resolved -> Closed)
  // -------------------------------------------------------------
  it("4. Traçabilité : Enregistre chronologiquement chaque étape du traitement", async function () {
    // 1. Déclaration
    await registry.connect(citizen).reportIssue("CITY-2026-001", "Pothole", "Rue Hassan II", "Nid de poule", "2026-11-19", "High");
    
    // 2. Affectation
    await registry.connect(municipality).assignTeam(1, "UrbanTeam01", "Ordre de mission envoyé");

    // 3. Début des travaux (InProgress = 2)
    await registry.connect(municipality).updateStatus(1, 2, "Rebouchage en cours");

    // 4. Travaux terminés (Resolved = 3)
    await registry.connect(municipality).updateStatus(1, 3, "Goudronnage terminé et séché");

    // 5. Clôture administrative (Closed = 4)
    await registry.connect(municipality).updateStatus(1, 4, "Contrôle qualité validé, dossier clôturé");

    const issue = await registry.getIssue(1);
    expect(issue.status).to.equal(4); // Closed

    // Vérification de la chaîne d'historique complète (5 étapes)
    const history = await registry.getIssueHistory(1);
    expect(history.length).to.equal(5);
    expect(history[2].comment).to.equal("Rebouchage en cours");
    expect(history[3].comment).to.equal("Goudronnage terminé et séché");
    expect(history[4].comment).to.equal("Contrôle qualité validé, dossier clôturé");
  });

  // -------------------------------------------------------------
  // TEST 5 : Règle Anti-Doublon
  // -------------------------------------------------------------
  it("5. Sécurité : Rejette un signalement avec un code d'incident déjà existant", async function () {
    await registry.connect(citizen).reportIssue("CITY-2026-001", "StreetLight", "Lieu A", "Desc", "2026-11-19", "Low");

    await expect(
      registry.connect(citizen).reportIssue("CITY-2026-001", "WaterLeak", "Lieu B", "Autre panne", "2026-11-19", "High")
    ).to.be.revertedWith("Erreur: Ce code de signalement existe deja");
  });

  // -------------------------------------------------------------
  // TEST 6 : Import Groupé (Batch Register pour Excel)
  // -------------------------------------------------------------
  it("6. L'importation groupée (Batch) enregistre correctement plusieurs pannes", async function () {
    const codes = ["CITY-2026-001", "CITY-2026-002"];
    const types = ["StreetLight", "WaterLeak"];
    const locations = ["Avenue Mohammed V", "Boulevard Zerktouni"];
    const descs = ["Lampadaire cassé", "Fuite tuyau principal"];
    const dates = ["2026-11-19", "2026-11-19"];
    const priorities = ["High", "High"];
    const teams = ["UrbanTeam01", "WaterTeam02"];
    const statuses = [0, 1]; // Reported, Assigned

    await registry.connect(municipality).batchRegisterIssues(
      codes,
      types,
      locations,
      descs,
      dates,
      priorities,
      teams,
      statuses
    );

    expect(await registry.getTotalIssues()).to.equal(2);
    const issue1 = await registry.getIssue(1);
    const issue2 = await registry.getIssue(2);
    expect(issue1.issueCode).to.equal("CITY-2026-001");
    expect(issue2.issueCode).to.equal("CITY-2026-002");
  });
});