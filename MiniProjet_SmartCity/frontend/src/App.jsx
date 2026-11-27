import { useRef, useState } from "react";
import { ethers } from "ethers";
import * as XLSX from "xlsx";
import { CONTRACT_ADDRESS, CONTRACT_ABI, STATUS_LABELS } from "./contractConfig";
import "./App.css";

function getTransactionErrorMessage(error) {
  const details = [
    error?.shortMessage,
    error?.reason,
    error?.message,
    error?.info?.error?.message,
    error?.error?.message,
  ].filter((message) => typeof message === "string").join(" ");

  if (/nonce too high|expected nonce.*got/i.test(details)) {
    return "MetaMask et le réseau local Hardhat ne sont plus synchronisés sur le nonce du compte. La transaction a été refusée. Dans MetaMask, ouvrez Paramètres → Avancé → Réinitialiser le compte, puis rechargez cette page et réessayez.";
  }

  return error?.reason || error?.shortMessage || error?.message || "Erreur inconnue.";
}

const iconPaths = {
  Activity: <><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></>,
  AlertTriangle: <><path d="m10.3 3.9-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3.1l-8-14a2 2 0 0 0-3.4 0Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></>,
  Archive: <><rect x="3" y="4" width="18" height="4" rx="1" /><path d="M5 8v11a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8" /><path d="M10 12h4" /></>,
  Building2: <><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18" /><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" /><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" /><path d="M10 6h4M10 10h4M10 14h4M10 18h4" /></>,
  CheckCircle2: <><circle cx="12" cy="12" r="10" /><path d="m9 12 2 2 4-4" /></>,
  CheckSquare: <><path d="m9 11 3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></>,
  Clock: <><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></>,
  FileSpreadsheet: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M8 13h8M8 17h8M11 13v4M15 13v4" /></>,
  History: <><path d="M3 12a9 9 0 1 0 2.6-6.4L3 8" /><path d="M3 3v5h5" /><path d="M12 7v5l3 2" /></>,
  MapPin: <><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
  PlusCircle: <><circle cx="12" cy="12" r="10" /><path d="M12 8v8M8 12h8" /></>,
  Search: <><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></>,
  Send: <><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></>,
  ShieldCheck: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" /><path d="m9 12 2 2 4-4" /></>,
  UploadCloud: <><path d="M16 16l-4-4-4 4M12 12v9" /><path d="M20 16.6A5 5 0 0 0 18 7h-1.3A8 8 0 1 0 4 16.3" /></>,
  User: <><path d="M20 21a8 8 0 0 0-16 0" /><circle cx="12" cy="8" r="5" /></>,
  Wallet: <><rect x="3" y="5" width="18" height="15" rx="2" /><path d="M3 8h18M16 14h2" /><path d="M3 5.5V5a2 2 0 0 1 2-2h13" /></>,
  Wrench: <><path d="M14.7 6.3a5 5 0 0 0-6.4 6.4L3 18l3 3 5.3-5.3a5 5 0 0 0 6.4-6.4L14 13l-3-3Z" /><path d="m14 10 3-3" /></>,
};

function Icon({ name, size = 18, className = "" }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {iconPaths[name]}
    </svg>
  );
}

function Banner({ type, children, onDismiss }) {
  const icon = type === "success" ? "CheckCircle2" : type === "warning" ? "AlertTriangle" : "AlertTriangle";
  return (
    <div className={`alert alert-${type}`} role={type === "danger" ? "alert" : "status"}>
      <Icon name={icon} size={19} className="alert-icon" />
      <div className="alert-content">{children}</div>
      <button className="icon-button alert-dismiss" type="button" onClick={onDismiss} aria-label="Fermer la notification">
        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <path d="m18 6-12 12M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

function SectionHeading({ eyebrow, title, description, icon }) {
  return (
    <div className="section-heading">
      <div className="section-icon"><Icon name={icon} size={20} /></div>
      <div>
        {eyebrow && <p className="eyebrow">{eyebrow}</p>}
        <h2>{title}</h2>
        {description && <p className="section-description">{description}</p>}
      </div>
    </div>
  );
}

function StatusPill({ status }) {
  const statusIcons = {
    Reported: "AlertTriangle",
    Assigned: "Clock",
    InProgress: "Activity",
    Resolved: "CheckCircle2",
    Closed: "Archive",
  };
  return (
    <span className={`status-pill status-${status}`}>
      <span className="status-dot" />
      {statusIcons[status] && <Icon name={statusIcons[status]} size={13} />}
      {status}
    </span>
  );
}

function App() {
  const transactionInFlight = useRef(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [account, setAccount] = useState("");
  const [contract, setContract] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeTab, setActiveTab] = useState("citizen");

  const [statusMessage, setStatusMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [txHash, setTxHash] = useState("");
  const [showAccessWarning, setShowAccessWarning] = useState(true);

  const [citizenForm, setCitizenForm] = useState(() => ({
    issueCode: `CITY-2026-${Math.floor(100 + Math.random() * 900)}`,
    issueType: "StreetLight",
    location: "Avenue Mohammed V",
    description: "Panne d'éclairage public sur le trottoir",
    reportDate: new Date().toISOString().split("T")[0],
    priority: "High",
  }));

  const [manageId, setManageId] = useState("");
  const [teamName, setTeamName] = useState("UrbanTeam01");
  const [teamComment, setTeamComment] = useState("Équipe envoyée sur site");
  const [updateStatusVal, setUpdateStatusVal] = useState(2);
  const [updateComment, setUpdateComment] = useState("Travaux de réparation en cours");

  const [excelData, setExcelData] = useState([]);
  const [selectedIndices, setSelectedIndices] = useState(new Set());

  const [searchId, setSearchId] = useState("");
  const [currentIssue, setCurrentIssue] = useState(null);
  const [currentHistory, setCurrentHistory] = useState([]);

  const connectWallet = async () => {
    try {
      setErrorMessage("");
      if (!window.ethereum) {
        setErrorMessage("MetaMask est introuvable. Installez l'extension puis réessayez.");
        return;
      }
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const userAddress = await signer.getAddress();
      setAccount(userAddress);

      const appContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
      setContract(appContract);

      const adminAddress = await appContract.municipalityAdmin();
      const hasAdmin = userAddress.toLowerCase() === adminAddress.toLowerCase();
      setIsAdmin(hasAdmin);
      setShowAccessWarning(true);
      setStatusMessage(hasAdmin ? "Connecté en tant qu'autorité municipale." : "Connecté en tant que citoyen.");
    } catch (err) {
      console.error(err);
      setErrorMessage("Erreur de connexion : " + (err.reason || err.message));
    }
  };

  const handleReportIssue = async (e) => {
    e.preventDefault();
    if (transactionInFlight.current) return;
    if (!contract) {
      setErrorMessage("Connectez votre wallet pour envoyer un signalement.");
      return;
    }
    transactionInFlight.current = true;
    setIsSubmitting(true);
    setStatusMessage("Enregistrement du signalement sur la blockchain…");
    setErrorMessage("");
    setTxHash("");

    try {
      const tx = await contract.reportIssue(
        citizenForm.issueCode,
        citizenForm.issueType,
        citizenForm.location,
        citizenForm.description,
        citizenForm.reportDate,
        citizenForm.priority
      );
      setStatusMessage("Transaction envoyée. En attente de confirmation…");
      const receipt = await tx.wait();
      setTxHash(receipt.hash);
      setStatusMessage(`Signalement ${citizenForm.issueCode} enregistré avec succès sur la blockchain.`);

      setCitizenForm({
        ...citizenForm,
        issueCode: `CITY-2026-${Math.floor(100 + Math.random() * 900)}`,
        description: "",
      });
    } catch (err) {
      console.error(err);
      setErrorMessage("Erreur : " + getTransactionErrorMessage(err));
      setStatusMessage("");
    } finally {
      transactionInFlight.current = false;
      setIsSubmitting(false);
    }
  };

  const handleAssignTeam = async (e) => {
    e.preventDefault();
    if (transactionInFlight.current) return;
    if (!contract || !manageId) {
      setErrorMessage("Connectez votre wallet et indiquez l'identifiant du signalement.");
      return;
    }
    if (!isAdmin) {
      setErrorMessage("Cette action est réservée aux services municipaux autorisés.");
      return;
    }
    transactionInFlight.current = true;
    setIsSubmitting(true);
    setStatusMessage("Affectation de l'équipe sur la blockchain…");
    setErrorMessage("");
    setTxHash("");

    try {
      const tx = await contract.assignTeam(BigInt(manageId), teamName, teamComment);
      const receipt = await tx.wait();
      setTxHash(receipt.hash);
      setStatusMessage(`Équipe « ${teamName} » affectée au signalement #${manageId}.`);
    } catch (err) {
      setErrorMessage("Erreur d'affectation : " + getTransactionErrorMessage(err));
    } finally {
      transactionInFlight.current = false;
      setIsSubmitting(false);
    }
  };

  const handleUpdateStatus = async (e) => {
    e.preventDefault();
    if (transactionInFlight.current) return;
    if (!contract || !manageId) {
      setErrorMessage("Connectez votre wallet et indiquez l'identifiant du signalement.");
      return;
    }
    if (!isAdmin) {
      setErrorMessage("Cette action est réservée aux services municipaux autorisés.");
      return;
    }
    transactionInFlight.current = true;
    setIsSubmitting(true);
    setStatusMessage("Mise à jour du statut sur la blockchain…");
    setErrorMessage("");
    setTxHash("");

    try {
      const tx = await contract.updateStatus(BigInt(manageId), updateStatusVal, updateComment);
      const receipt = await tx.wait();
      setTxHash(receipt.hash);
      setStatusMessage(`Statut mis à jour vers « ${STATUS_LABELS[updateStatusVal]} » avec succès.`);
    } catch (err) {
      setErrorMessage("Erreur de statut : " + getTransactionErrorMessage(err));
    } finally {
      transactionInFlight.current = false;
      setIsSubmitting(false);
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(ws);

        if (data.length === 0) {
          setErrorMessage("Le fichier Excel est vide.");
          return;
        }
        setExcelData(data);
        setSelectedIndices(new Set(data.map((_, i) => i)));
        setStatusMessage(`Fichier chargé : ${data.length} signalement(s) détecté(s).`);
        setErrorMessage("");
      } catch (err) {
        setErrorMessage("Erreur de lecture Excel : " + err.message);
      }
    };
    reader.readAsBinaryString(file);
  };

  const toggleSelectRow = (index) => {
    const updated = new Set(selectedIndices);
    if (updated.has(index)) updated.delete(index);
    else updated.add(index);
    setSelectedIndices(updated);
  };

  const toggleSelectAll = () => {
    if (selectedIndices.size === excelData.length) setSelectedIndices(new Set());
    else setSelectedIndices(new Set(excelData.map((_, i) => i)));
  };

  const handleBatchRegister = async () => {
    if (transactionInFlight.current) return;
    if (!contract || selectedIndices.size === 0) {
      setErrorMessage("Connectez votre wallet et sélectionnez au moins un signalement.");
      return;
    }
    if (!isAdmin) {
      setErrorMessage("Cette action est réservée aux services municipaux autorisés.");
      return;
    }

    transactionInFlight.current = true;
    setIsSubmitting(true);
    setStatusMessage("Enregistrement groupé en cours sur la blockchain…");
    setErrorMessage("");
    setTxHash("");

    try {
      const selected = excelData.filter((_, idx) => selectedIndices.has(idx));
      const codes = [];
      const types = [];
      const locations = [];
      const descs = [];
      const dates = [];
      const priorities = [];
      const teams = [];
      const statuses = [];

      selected.forEach((row) => {
        codes.push(row.issueId || `CITY-${Date.now()}`);
        types.push(row.issueType || "StreetLight");
        locations.push(row.location || "Non précisé");
        descs.push(row.description || "Signalement");
        dates.push(row.reportDate || "2026-11-20");
        priorities.push(row.priority || "Medium");
        teams.push(row.assignedTo || "UrbanTeam01");
        statuses.push(0);
      });

      const tx = await contract.batchRegisterIssues(codes, types, locations, descs, dates, priorities, teams, statuses);
      const receipt = await tx.wait();
      setTxHash(receipt.hash);
      setStatusMessage(`${selected.length} signalement(s) enregistré(s) en une transaction.`);
    } catch (err) {
      console.error(err);
      setErrorMessage("Erreur d'enregistrement groupé : " + getTransactionErrorMessage(err));
    } finally {
      transactionInFlight.current = false;
      setIsSubmitting(false);
    }
  };

  const handleSearchIssue = async (e) => {
    e.preventDefault();
    if (!searchId || isNaN(searchId)) {
      setErrorMessage("Saisissez un identifiant numérique valide, par exemple 1.");
      return;
    }
    setErrorMessage("");
    setStatusMessage("Recherche sur la blockchain…");

    try {
      const provider = window.ethereum
        ? new ethers.BrowserProvider(window.ethereum)
        : new ethers.JsonRpcProvider("http://127.0.0.1:8545");

      const readContract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
      const issue = await readContract.getIssue(BigInt(searchId));
      const history = await readContract.getIssueHistory(BigInt(searchId));

      setCurrentIssue(issue);
      setCurrentHistory(history);
      setStatusMessage("");
    } catch (err) {
      console.error(err);
      setCurrentIssue(null);
      setCurrentHistory([]);
      setErrorMessage("Signalement introuvable sur la blockchain.");
      setStatusMessage("");
    }
  };

  const tabs = [
    { id: "citizen", icon: "PlusCircle", title: "Espace citoyen", subtitle: "Nouveau signalement" },
    { id: "municipality", icon: "Building2", title: "Municipalité", subtitle: "Gestion des interventions" },
    { id: "search", icon: "Search", title: "Traçabilité", subtitle: "Suivi public" },
  ];

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="Smart City, accueil" onClick={(e) => e.preventDefault()}>
          <span className="brand-mark"><Icon name="Building2" size={22} /></span>
          <span className="brand-copy">
            <strong>civitas<span>.</span></strong>
            <small>SMART CITY PLATFORM</small>
          </span>
        </a>
        <div className="topbar-right">
          <div className="network-indicator"><span className="network-dot" /> Registre Ethereum</div>
          {account ? (
            <div className="wallet-connected">
              <span className={`role-badge ${isAdmin ? "role-admin" : "role-user"}`}>
                <Icon name={isAdmin ? "ShieldCheck" : "User"} size={15} />
                {isAdmin ? "Administration" : "Citoyen"}
              </span>
              <span className="account-badge" title={account}>
                <span className="account-dot" />
                {account.substring(0, 6)}…{account.substring(account.length - 4)}
              </span>
            </div>
          ) : (
            <button className="btn-primary connect-button" onClick={connectWallet}>
              <Icon name="Wallet" size={17} />
              Connecter MetaMask
            </button>
          )}
        </div>
      </header>

      <div className="page-wrap">
        <section className="welcome-row">
          <div>
            <p className="eyebrow">PORTAIL DES SERVICES URBAINS</p>
            <h1>Une ville plus <span>réactive.</span></h1>
            <p className="welcome-copy">Signalez, suivez et résolvez les incidents de votre ville grâce à un registre transparent.</p>
          </div>
          <div className="ledger-card">
            <div className="ledger-icon"><Icon name="Activity" size={19} /></div>
            <div><span>Infrastructure</span><strong>Registre décentralisé</strong></div>
            <span className="ledger-live"><i /> ACTIF</span>
          </div>
        </section>

        <nav className="tabs" aria-label="Sections de la plateforme">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              className={`tab-btn ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
              aria-current={activeTab === tab.id ? "page" : undefined}
            >
              <span className="tab-icon"><Icon name={tab.icon} size={18} /></span>
              <span className="tab-copy"><strong>{tab.title}</strong><small>{tab.subtitle}</small></span>
            </button>
          ))}
        </nav>

        <section className="notifications" aria-live="polite">
          {statusMessage && (
            <Banner type="success" onDismiss={() => setStatusMessage("")}>
              <span>{statusMessage}</span>
            </Banner>
          )}
          {errorMessage && (
            <Banner type="danger" onDismiss={() => setErrorMessage("")}>
              <span>{errorMessage}</span>
            </Banner>
          )}
          {txHash && (
            <Banner type="info" onDismiss={() => setTxHash("")}>
              <div className="tx-message"><strong>Transaction confirmée</strong><code>{txHash}</code></div>
            </Banner>
          )}
        </section>

        {activeTab === "citizen" && (
          <div className="tab-content">
            <section className="card">
              <SectionHeading
                eyebrow="PARTICIPATION CITOYENNE"
                title="Signaler un incident"
                description="Décrivez le problème rencontré. Votre déclaration sera inscrite dans le registre public."
                icon="PlusCircle"
              />
              <form onSubmit={handleReportIssue} className="form-grid">
                <div className="form-group">
                  <label htmlFor="issue-code">Code du signalement</label>
                  <input id="issue-code" type="text" required value={citizenForm.issueCode} onChange={(e) => setCitizenForm({ ...citizenForm, issueCode: e.target.value })} />
                </div>
                <div className="form-group">
                  <label htmlFor="issue-type">Type d'incident</label>
                  <select id="issue-type" value={citizenForm.issueType} onChange={(e) => setCitizenForm({ ...citizenForm, issueType: e.target.value })}>
                    <option value="StreetLight">Éclairage public</option>
                    <option value="Pothole">Voirie / Nid de poule</option>
                    <option value="WaterLeak">Fuite d'eau</option>
                    <option value="WasteManagement">Propreté / Déchets</option>
                    <option value="TrafficSign">Signalisation</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="issue-location">Localisation exacte</label>
                  <div className="input-with-icon"><Icon name="MapPin" size={17} /><input id="issue-location" type="text" required placeholder="Ex. Avenue Mohammed V" value={citizenForm.location} onChange={(e) => setCitizenForm({ ...citizenForm, location: e.target.value })} /></div>
                </div>
                <div className="form-group">
                  <label htmlFor="issue-priority">Niveau de priorité</label>
                  <select id="issue-priority" value={citizenForm.priority} onChange={(e) => setCitizenForm({ ...citizenForm, priority: e.target.value })}>
                    <option value="Low">Faible</option>
                    <option value="Medium">Moyenne</option>
                    <option value="High">Urgente</option>
                  </select>
                </div>
                <div className="form-group full-width">
                  <label htmlFor="issue-description">Description du problème</label>
                  <textarea id="issue-description" rows="4" required placeholder="Décrivez le dysfonctionnement et son impact…" value={citizenForm.description} onChange={(e) => setCitizenForm({ ...citizenForm, description: e.target.value })} />
                </div>
                <div className="form-footer full-width">
                  <span className="form-note"><Icon name="ShieldCheck" size={15} /> Enregistrement public et vérifiable</span>
                  <button type="submit" className="btn-primary" disabled={isSubmitting}>
                    <Icon name="Send" size={17} /> {isSubmitting ? "Transaction en cours…" : "Envoyer le signalement"}
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}

        {activeTab === "municipality" && (
          <div className="tab-content">
            {!isAdmin && account && showAccessWarning && (
              <Banner type="warning" onDismiss={() => setShowAccessWarning(false)}>
                <strong>Accès restreint.</strong> Connectez-vous avec le portefeuille d'administration municipale pour affecter des équipes et modifier les statuts.
              </Banner>
            )}

            <div className="grid-2-cols">
              <section className="card">
                <SectionHeading eyebrow="OPÉRATIONS" title="Affecter une équipe" description="Assignez une équipe technique à un signalement." icon="Wrench" />
                <form onSubmit={handleAssignTeam}>
                  <div className="form-group">
                    <label htmlFor="manage-id-team">Identifiant du signalement</label>
                    <input id="manage-id-team" type="number" min="1" placeholder="Ex. 1" required value={manageId} onChange={(e) => setManageId(e.target.value)} />
                  </div>
                  <div className="form-group mt-10">
                    <label htmlFor="team-name">Équipe technique</label>
                    <input id="team-name" type="text" required value={teamName} onChange={(e) => setTeamName(e.target.value)} />
                  </div>
                  <div className="form-group mt-10">
                    <label htmlFor="team-comment">Commentaire de mission</label>
                    <input id="team-comment" type="text" required value={teamComment} onChange={(e) => setTeamComment(e.target.value)} />
                  </div>
                  <button type="submit" className="btn-primary full-width mt-10" disabled={!isAdmin || isSubmitting}>
                    <Icon name="Wrench" size={17} /> {isSubmitting ? "Transaction en cours…" : "Affecter l'équipe"}
                  </button>
                </form>
              </section>

              <section className="card">
                <SectionHeading eyebrow="SUIVI D'INTERVENTION" title="Mettre à jour le statut" description="Consignez l'avancement des travaux dans le registre." icon="Activity" />
                <form onSubmit={handleUpdateStatus}>
                  <div className="form-group">
                    <label htmlFor="manage-id-status">Identifiant du signalement</label>
                    <input id="manage-id-status" type="number" min="1" placeholder="Ex. 1" required value={manageId} onChange={(e) => setManageId(e.target.value)} />
                  </div>
                  <div className="form-group mt-10">
                    <label htmlFor="new-status">Nouveau statut</label>
                    <select id="new-status" value={updateStatusVal} onChange={(e) => setUpdateStatusVal(Number(e.target.value))}>
                      <option value={2}>En cours d'intervention</option>
                      <option value={3}>Travaux résolus</option>
                      <option value={4}>Dossier clôturé</option>
                    </select>
                  </div>
                  <div className="form-group mt-10">
                    <label htmlFor="status-comment">Rapport d'intervention</label>
                    <input id="status-comment" type="text" required value={updateComment} onChange={(e) => setUpdateComment(e.target.value)} />
                  </div>
                  <button type="submit" className="btn-primary full-width mt-10" disabled={!isAdmin || isSubmitting}>
                    <Icon name="CheckCircle2" size={17} /> {isSubmitting ? "Transaction en cours…" : "Valider le changement"}
                  </button>
                </form>
              </section>
            </div>

            <section className="card">
              <SectionHeading
                eyebrow="IMPORT EN LOT"
                title="Importer des signalements"
                description="Chargez un classeur Excel ou un fichier CSV, vérifiez les lignes, puis enregistrez-les en une transaction."
                icon="FileSpreadsheet"
              />
              <label className="upload-box" htmlFor="excel-file">
                <span className="upload-icon"><Icon name="UploadCloud" size={22} /></span>
                <span className="upload-copy"><strong>Choisir un fichier à importer</strong><small>Format .xlsx ou .csv · Classeur urban_issues.xlsx compatible</small></span>
                <span className="upload-action">Parcourir</span>
                <input id="excel-file" type="file" accept=".xlsx,.csv" onChange={handleFileUpload} />
              </label>

              {excelData.length > 0 && (
                <div className="table-section">
                  <div className="table-heading">
                    <div><h3>Aperçu des données</h3><p>Vérifiez les lignes sélectionnées avant l'enregistrement.</p></div>
                    <span className="selection-count"><Icon name="CheckSquare" size={15} /> {selectedIndices.size} / {excelData.length} sélectionnés</span>
                  </div>
                  <div className="table-wrapper">
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th className="checkbox-cell">
                            <input type="checkbox" aria-label="Sélectionner toutes les lignes" checked={selectedIndices.size === excelData.length} onChange={toggleSelectAll} />
                          </th>
                          <th>Code</th><th>Type</th><th>Localisation</th><th>Priorité</th><th>Équipe</th>
                        </tr>
                      </thead>
                      <tbody>
                        {excelData.map((row, idx) => (
                          <tr key={idx} className={selectedIndices.has(idx) ? "selected-row" : ""}>
                            <td className="checkbox-cell"><input type="checkbox" aria-label={`Sélectionner ${row.issueId || `la ligne ${idx + 1}`}`} checked={selectedIndices.has(idx)} onChange={() => toggleSelectRow(idx)} /></td>
                            <td><strong className="table-code">{row.issueId || "—"}</strong></td>
                            <td>{row.issueType || "—"}</td>
                            <td>{row.location || "—"}</td>
                            <td><span className={`priority-tag ${row.priority || "Medium"}`}><span className="priority-dot" />{row.priority || "Medium"}</span></td>
                            <td>{row.assignedTo || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <button onClick={handleBatchRegister} className="btn-primary mt-10" disabled={!isAdmin || selectedIndices.size === 0 || isSubmitting}>
                    <Icon name="UploadCloud" size={17} /> {isSubmitting ? "Transaction en cours…" : `Enregistrer ${selectedIndices.size} signalement(s) sur la blockchain`}
                  </button>
                </div>
              )}
            </section>
          </div>
        )}

        {activeTab === "search" && (
          <div className="tab-content">
            <section className="card">
              <SectionHeading
                eyebrow="REGISTRE PUBLIC"
                title="Suivi et traçabilité"
                description="Consultez le statut actuel et l'historique vérifiable d'un signalement."
                icon="History"
              />
              <form onSubmit={handleSearchIssue} className="search-form">
                <label className="search-input-wrap" htmlFor="search-id">
                  <Icon name="Search" size={18} />
                  <input id="search-id" type="number" min="1" placeholder="Identifiant numérique du signalement (ex. 1)" value={searchId} onChange={(e) => setSearchId(e.target.value)} />
                </label>
                <button type="submit" className="btn-primary"><Icon name="Search" size={17} /> Consulter le registre</button>
              </form>

              {currentIssue && (
                <div className="issue-details-card">
                  <div className="issue-header">
                    <div>
                      <p className="eyebrow">SIGNALEMENT {String(currentIssue.id)}</p>
                      <div className="issue-title-row">
                        <h3 className="badge-code">{currentIssue.issueCode}</h3>
                        <StatusPill status={STATUS_LABELS[Number(currentIssue.status)]} />
                      </div>
                    </div>
                    <span className={`priority-tag ${currentIssue.priority}`}><span className="priority-dot" />Priorité {currentIssue.priority}</span>
                  </div>

                  <div className="issue-body">
                    <div className="issue-fact"><span>Localisation</span><strong><Icon name="MapPin" size={16} />{currentIssue.location}</strong></div>
                    <div className="issue-fact"><span>Type d'incident</span><strong>{currentIssue.issueType}</strong></div>
                    <div className="issue-fact"><span>Équipe en charge</span><strong>{currentIssue.assignedTo || "En attente d'affectation"}</strong></div>
                    <div className="issue-fact issue-description"><span>Description</span><p>{currentIssue.description}</p></div>
                  </div>

                  <p className="reporter-meta">
                    Déclaré le {currentIssue.reportDate} <span className="meta-divider">·</span> Adresse du déclarant <code>{currentIssue.reporter}</code>
                  </p>

                  <div className="timeline-section">
                    <div className="timeline-heading">
                      <div><h3>Historique des interventions</h3><p>Journal infalsifiable des changements de statut</p></div>
                      <span className="history-count">{currentHistory.length} événements</span>
                    </div>
                    {currentHistory.length > 0 ? (
                      <div className="timeline">
                        {currentHistory.map((step, idx) => (
                          <article key={idx} className="timeline-item">
                            <div className="timeline-marker"><Icon name={STATUS_LABELS[Number(step.status)] === "Resolved" ? "CheckCircle2" : STATUS_LABELS[Number(step.status)] === "Closed" ? "Archive" : STATUS_LABELS[Number(step.status)] === "Reported" ? "AlertTriangle" : "Activity"} size={15} /></div>
                            <div className="timeline-content">
                              <div className="timeline-title">
                                <StatusPill status={STATUS_LABELS[Number(step.status)]} />
                                <time className="timeline-date">{new Date(Number(step.timestamp) * 1000).toLocaleString()}</time>
                              </div>
                              <p className="timeline-comment">{step.comment ? `« ${step.comment} »` : "Aucun commentaire ajouté."}</p>
                              <p className="timeline-agent"><span>Équipe</span><strong>{step.assignedTo || "Non affectée"}</strong><span>Signataire</span><code>{step.actor}</code></p>
                            </div>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <div className="empty-history"><Icon name="Clock" size={19} /><span>Aucun événement enregistré pour le moment.</span></div>
                    )}
                  </div>
                </div>
              )}
              {!currentIssue && (
                <div className="search-empty">
                  <span className="empty-icon"><Icon name="Search" size={22} /></span>
                  <strong>Rechercher un signalement</strong>
                  <p>Saisissez son identifiant pour consulter son statut et son historique d'intervention.</p>
                </div>
              )}
            </section>
          </div>
        )}

        <footer className="footer">
          <span><span className="footer-mark"><Icon name="ShieldCheck" size={14} /></span> Une gestion urbaine transparente</span>
          <span>Smart City <span className="footer-separator">·</span> Registre décentralisé</span>
        </footer>
      </div>
    </main>
  );
}

export default App;
