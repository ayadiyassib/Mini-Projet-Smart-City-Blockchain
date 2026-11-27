// SPDX-License-Identifier: MIT
pragma solidity ^0.8.26;

/**
 * @title UrbanIssueRegistry
 * @notice Plateforme décentralisée de gestion et traçabilité des services urbains (Smart City).
 */
contract UrbanIssueRegistry {

    // 1. Les 5 statuts officiels du cycle de vie (Partie 1 du PDF)
    enum IssueStatus { Reported, Assigned, InProgress, Resolved, Closed }

    // 2. Fiche d'un signalement urbain
    struct Issue {
        uint256 id;             // Identifiant numérique unique (1, 2, 3...)
        string issueCode;       // Identifiant texte (ex: CITY-2026-001)
        string issueType;       // Type (StreetLight, Pothole, WaterLeak...)
        string location;        // Localisation (ex: Avenue Mohammed V)
        string description;     // Description du problème
        string reportDate;      // Date déclarée (format ISO YYYY-MM-DD)
        string priority;        // Priorité (Low, Medium, High)
        address reporter;       // Adresse blockchain du citoyen
        string assignedTo;      // Équipe affectée (ex: UrbanTeam01)
        IssueStatus status;     // Statut actuel
        bool exists;            // Vérification d'existence
    }

    // 3. Traçabilité : Historique d'intervention (Partie 4 du PDF)
    struct HistoryRecord {
        uint256 timestamp;      // Heure exacte de l'action sur la blockchain
        IssueStatus status;     // Nouveau statut appliqué
        string assignedTo;      // Équipe affectée au moment de l'action
        string comment;         // Commentaire de l'intervention
        address actor;          // Adresse blockchain de l'agent municipal
    }

    // L'autorité municipale (Admin)
    address public municipalityAdmin;
    uint256 public nextIssueId = 1;

    // Stockage principal : id => Signalement
    mapping(uint256 => Issue) public issues;

    // Traçabilité : id => Liste chronologique de toutes les interventions
    mapping(uint256 => HistoryRecord[]) private _issueHistory;

    // Anti-doublon : issueCode => déjà existant ?
    mapping(string => bool) private _codeExists;

    // 4. Événements de traçabilité (Partie 1 du PDF)
    event IssueReported(uint256 indexed id, string issueCode, string issueType, string priority, address indexed reporter);
    event IssueAssigned(uint256 indexed id, string assignedTo, address indexed actor);
    event StatusUpdated(uint256 indexed id, IssueStatus newStatus, string comment, address indexed actor);

    // Sécurité : Seule la mairie ou ses agents peuvent affecter et mettre à jour
    modifier onlyMunicipality() {
        require(msg.sender == municipalityAdmin, "Erreur: Action reservee aux services municipaux");
        _;
    }

    constructor() {
        municipalityAdmin = msg.sender;
    }

    /**
     * @notice Déclaration d'un problème urbain par un citoyen
     */
    function reportIssue(
        string calldata issueCode,
        string calldata issueType,
        string calldata location,
        string calldata description,
        string calldata reportDate,
        string calldata priority
    ) external returns (uint256) {
        require(bytes(issueCode).length > 0, "Code signalement obligatoire");
        require(bytes(location).length > 0, "Localisation obligatoire");
        require(!_codeExists[issueCode], "Erreur: Ce code de signalement existe deja");

        uint256 id = nextIssueId++;

        // Création du signalement au statut initial "Reported"
        issues[id] = Issue({
            id: id,
            issueCode: issueCode,
            issueType: issueType,
            location: location,
            description: description,
            reportDate: reportDate,
            priority: priority,
            reporter: msg.sender,
            assignedTo: "Non affectee",
            status: IssueStatus.Reported,
            exists: true
        });

        _codeExists[issueCode] = true;

        // Premier enregistrement dans l'historique de traçabilité
        _issueHistory[id].push(HistoryRecord({
            timestamp: block.timestamp,
            status: IssueStatus.Reported,
            assignedTo: "Non affectee",
            comment: "Signalement declare par le citoyen",
            actor: msg.sender
        }));

        emit IssueReported(id, issueCode, issueType, priority, msg.sender);
        return id;
    }

    /**
     * @notice Affectation d'une équipe technique par la municipalité
     */
    function assignTeam(
        uint256 id,
        string calldata teamName,
        string calldata comment
    ) external onlyMunicipality {
        require(issues[id].exists, "Signalement inexistant");
        require(bytes(teamName).length > 0, "Nom d'equipe obligatoire");

        Issue storage issue = issues[id];
        issue.assignedTo = teamName;
        issue.status = IssueStatus.Assigned; // Passage automatique à "Assigned"

        // Ajout à l'historique
        _issueHistory[id].push(HistoryRecord({
            timestamp: block.timestamp,
            status: IssueStatus.Assigned,
            assignedTo: teamName,
            comment: comment,
            actor: msg.sender
        }));

        emit IssueAssigned(id, teamName, msg.sender);
    }

    /**
     * @notice Mise à jour du statut par les équipes municipales
     */
    function updateStatus(
        uint256 id,
        IssueStatus newStatus,
        string calldata comment
    ) external onlyMunicipality {
        require(issues[id].exists, "Signalement inexistant");

        Issue storage issue = issues[id];
        issue.status = newStatus;

        // Ajout à l'historique
        _issueHistory[id].push(HistoryRecord({
            timestamp: block.timestamp,
            status: newStatus,
            assignedTo: issue.assignedTo,
            comment: comment,
            actor: msg.sender
        }));

        emit StatusUpdated(id, newStatus, comment, msg.sender);
    }

    /**
     * @notice Importation groupée (Batch) pour le fichier Excel urban_issues.xlsx (Partie 3 du PDF)
     */
    function batchRegisterIssues(
        string[] calldata issueCodes,
        string[] calldata issueTypes,
        string[] calldata locations,
        string[] calldata descriptions,
        string[] calldata reportDates,
        string[] calldata priorities,
        string[] calldata assignedTeams,
        IssueStatus[] calldata initialStatuses
    ) external onlyMunicipality {
        uint256 count = issueCodes.length;
        require(count > 0, "Aucune donnee");
        require(
            issueTypes.length == count &&
            locations.length == count &&
            descriptions.length == count &&
            reportDates.length == count &&
            priorities.length == count &&
            assignedTeams.length == count &&
            initialStatuses.length == count,
            "Tailles de tableaux incoherentes"
        );

        for (uint256 i = 0; i < count; i++) {
            if (!_codeExists[issueCodes[i]]) {
                uint256 id = nextIssueId++;

                issues[id] = Issue({
                    id: id,
                    issueCode: issueCodes[i],
                    issueType: issueTypes[i],
                    location: locations[i],
                    description: descriptions[i],
                    reportDate: reportDates[i],
                    priority: priorities[i],
                    reporter: msg.sender,
                    assignedTo: assignedTeams[i],
                    status: initialStatuses[i],
                    exists: true
                });

                _codeExists[issueCodes[i]] = true;

                _issueHistory[id].push(HistoryRecord({
                    timestamp: block.timestamp,
                    status: initialStatuses[i],
                    assignedTo: assignedTeams[i],
                    comment: "Importe via fichier Excel municipal",
                    actor: msg.sender
                }));

                emit IssueReported(id, issueCodes[i], issueTypes[i], priorities[i], msg.sender);
            }
        }
    }

    /**
     * @notice Consultation d'un signalement (view gratuit)
     */
    function getIssue(uint256 id) external view returns (Issue memory) {
        require(issues[id].exists, "Signalement inexistant");
        return issues[id];
    }

    /**
     * @notice Consultation de l'historique complet d'une intervention (view gratuit)
     */
    function getIssueHistory(uint256 id) external view returns (HistoryRecord[] memory) {
        require(issues[id].exists, "Signalement inexistant");
        return _issueHistory[id];
    }

    /**
     * @notice Nombre total de signalements enregistrés
     */
    function getTotalIssues() external view returns (uint256) {
        return nextIssueId - 1;
    }
}