import { useLibraries } from "./contexts/LibrariesContext";

const {getLocales} = useLibraries()
// 1. Detect the device language
export const deviceLanguage = getLocales()[0].languageCode;

// 2. Map device language to your supported keys
export const getAppLanguage = (): 'en' | 'fr' | 'ar' => {
  if (deviceLanguage === 'fr') return 'fr';
  if (deviceLanguage === 'ar') return 'ar';
  return 'en';
};

// 3. Simple helper to get a string
export const t = (key: keyof typeof TRANSLATIONS.en) => {
  const lang = getAppLanguage();
  return TRANSLATIONS[lang][key];
};

type TranslationKeys = {
  roomTitle: string;
  // Lobby & Matchmaking
  lobbyTitle: string;
  myProfile: string;
  createRoom: string;
  roomPlaceholder: string;
  createBtn: string;
  availableRooms: string;
  noRooms: string;
  join: string;
  full: string;
  waiting: string;
  readyMatch: string;
  searchMatch: string;
  players: string;
  joinError: string;

  // Board & Seats
  removeBot: string;
  teamUs: string;
  teamThem: string;
  empty: string;
  picking: string;
  
  // Voice & Chat
  mute: string;
  unmute: string;
  muteAll: string;
  unmuteAll: string;
  micOn: string;
  micOff: string;
  connectingVoice: string;
  othersConnected: string;

  // Admin Actions
  kick: string;
  ban: string;
  makeMod: string;
  toAudience: string;
  follow: string;
  owner: string;
  moderator: string;

  // General UI
  error: string;
  success: string;
  failedPull: string;
  followSuccess: string;
  bot: string;
  audience: string;
  findPlayers: string;
  leave: string;
  invite: string;
  newGame: string;
  startGame: string;
  endGame: string;
  lobbyEmpty: string;
  noPlayersSearching: string;
  successFollow: string;
  distribute: string;
  bid: string;
  pass: string;
  coinche: string;
  gat: string;
  sleep: string;
  currentPli: string;
  pli: string;
  confirm: string;
  close: string;
  team1: string;
  team2: string;
  fraudTitle: string;
  sleepTitle: string;
  chooseSuit: string;
  selectCard: string;
  roundOver: string;
};

 const TRANSLATIONS: Record<string, TranslationKeys> = {
  en: {
    lobbyTitle: "CARDI LOBBY",
    myProfile: "My Profile",
    createRoom: "Create a Room",
    roomPlaceholder: "Room Name...",
    createBtn: "CREATE",
    availableRooms: "Available Rooms",
    noRooms: "No rooms available. Create one!",
    join: "JOIN",
    full: "FULL",
    waiting: "WAITING",
    readyMatch: "Ready to be Added",
    searchMatch: "Join a Public Room",
    players: "Players",
    joinError: "Could not join room.",
    removeBot: "Remove Bot",
    teamUs: "US",
    teamThem: "THEM",
    empty: "Empty",
    picking: "Picking...",
    mute: "Mute",
    unmute: "Unmute",
    muteAll: "Mute All",
    unmuteAll: "Unmute All",
    kick: "Kick Player",
    ban: "Ban Player",
    makeMod: "Make Moderator",
    toAudience: "Move to Audience",
    follow: "Follow",
    owner: "Owner",
    moderator: "Moderator",
    error: "Error",
    success: "Success",
    failedPull: "Failed to pull players from the lobby.",
    followSuccess: "You are now following",
    audience: "Audience",
    bot: "BOT",
    findPlayers: "Find Players",
    leave: "Leave",
    micOn: "MIC ON",
    micOff: "MIC OFF",
    connectingVoice: "Connecting...",
    othersConnected: "Others Connected",
    invite: "INVITE",
    newGame: "New Game",
    startGame: "START GAME",
    endGame: "End Game",
    lobbyEmpty: "Lobby Empty",
    noPlayersSearching: "No players are searching right now.",
    successFollow: "You followed this player!",
    distribute: "DEAL",
    bid: "Bid",
    pass: "Pass",
    coinche: "×2",
    gat: "⚠️ GAT",
    sleep: "💤 SLEEP",
    currentPli: "CURRENT",
    pli: "TRICK",
    confirm: "VALIDATE",
    close: "CLOSE",
    team1: "ME/P3",
    team2: "P2/P4",
    fraudTitle: "CLAIM GAT",
    sleepTitle: "DECLARE SLEEP",
    chooseSuit: "Choose Suit",
    selectCard: "Select suspected card",
    roundOver: "Round is over.",
    roomTitle: ''
  },
  fr: {
    lobbyTitle: "SALON CARDI",
    myProfile: "Mon Profil",
    createRoom: "Créer une salle",
    roomPlaceholder: "Nom de la salle...",
    createBtn: "CRÉER",
    availableRooms: "Salles disponibles",
    noRooms: "Aucune salle. Créez-en une !",
    join: "REJOINDRE",
    full: "PLEIN",
    waiting: "EN ATTENTE",
    readyMatch: "Prêt à être ajouté",
    searchMatch: "Rejoindre salle publique",
    players: "Joueurs",
    joinError: "Impossible de rejoindre.",
    removeBot: "Supprimer le Robot",
    teamUs: "NOUS",
    teamThem: "EUX",
    empty: "Vide",
    picking: "Choix...",
    mute: "Sourdine",
    unmute: "Réactiver",
    muteAll: "Tout couper",
    unmuteAll: "Tout réactiver",
    kick: "Expulser",
    ban: "Bannir",
    makeMod: "Nommer Modérateur",
    toAudience: "Placer en Audience",
    follow: "Suivre",
    owner: "Propriétaire",
    moderator: "Modérateur",
    error: "Erreur",
    success: "Succès",
    failedPull: "Impossible de récupérer les joueurs du lobby.",
    followSuccess: "Vous suivez maintenant",
    bot: "ROBOT",
    audience: "Public",
    findPlayers: "Trouver des joueurs",
    leave: "Quitter",
    micOn: "MICRO ON",
    micOff: "MICRO OFF",
    connectingVoice: "Connexion...",
    othersConnected: "Autres Connectés",
    invite: "INVITER",
    newGame: "Nouveau Jeu",
    startGame: "DÉMARRER",
    endGame: "Finir le Jeu",
    lobbyEmpty: "Lobby Vide",
    noPlayersSearching: "Aucun joueur en recherche.",
    successFollow: "Vous suivez ce joueur !",
    distribute: "DISTRIBUER",
    bid: "Enchère",
    pass: "Passe",
    coinche: "×2",
    gat: "⚠️ Faux Jeu",
    sleep: "💤 SOMMEIL",
    currentPli: "EN COURS",
    pli: "PLI",
    confirm: "VALIDER",
    close: "FERMER",
    team1: "NOUS",
    team2: "VOUS",
    fraudTitle: "RÉCLAMATION DE FAUX JEU",
    sleepTitle: "DÉCLARER UN SOMMEIL",
    chooseSuit: "Choisissez la couleur",
    selectCard: "Sélectionnez la carte suspectée",
    roundOver: "Le round est terminé.",
    roomTitle: ''
  },
  ar: {
    lobbyTitle: "قاعة كاردي",
    myProfile: "ملفي الشخصي",
    createRoom: "إنشاء غرفة",
    roomPlaceholder: "اسم الغرفة...",
    createBtn: "إنشاء",
    availableRooms: "الغرف المتاحة",
    noRooms: "لا توجد غرف متاحة. أنشئ واحدة!",
    join: "دخول",
    full: "ممتلئة",
    waiting: "في الانتظار",
    readyMatch: "جاهز للإضافة",
    searchMatch: "انضم لغرفة عامة",
    players: "لاعبين",
    joinError: "تعذر الانضمام للغرفة.",
    removeBot: "حذف البوت",
    teamUs: "نحن",
    teamThem: "هم",
    empty: "فارغ",
    picking: "جاري الاختيار...",
    mute: "كتم",
    unmute: "إلغاء الكتم",
    muteAll: "كتم الكل",
    unmuteAll: "تفعيل الكل",
    kick: "طرد",
    ban: "حظر",
    makeMod: "تعيين مشرف",
    toAudience: "نقل للمتفرجين",
    follow: "متابعة",
    owner: "صاحب الغرفة",
    moderator: "مشرف",
    error: "خطأ",
    success: "تم بنجاح",
    failedPull: "فشل في سحب اللاعبين من القائمة.",
    followSuccess: "أنت الآن تتابع",
    bot: "بوت",
    audience: "الجمهور",
    findPlayers: "البحث عن لاعبين",
    leave: "خروج",
    micOn: "الميكروفون يعمل",
    micOff: "الميكروفون مغلق",
    connectingVoice: "جاري الاتصال...",
    othersConnected: "متصلون آخرون",
    invite: "دعوة",
    newGame: "لعبة جديدة",
    startGame: "بدء اللعبة",
    endGame: "إنهاء اللعبة",
    lobbyEmpty: "قائمة الانتظار فارغة",
    noPlayersSearching: "لا يوجد لاعبون يبحثون حالياً.",
    successFollow: "أنت تتابع هذا اللاعب الآن!",
    distribute: "توزيع",
    bid: "مزايدة",
    pass: "تجاوز",
    coinche: "×2",
    gat: "⚠️ امجي",
    sleep: "💤 نوم",
    currentPli: "الحالي",
    pli: "جولة",
    confirm: "تأكيد",
    close: "إغلاق",
    team1: "أنا/3",
    team2: "2/4",
    fraudTitle: "مطالبة بامجي",
    sleepTitle: "💤 تنويم",
    chooseSuit: "اختر اللون",
    selectCard: "اختر الورقة المشتبه بها",
    roundOver: "انتهت الجولة.",
    roomTitle: ''
  }
};


export default TRANSLATIONS[getAppLanguage()];