import { capitalize } from './utils.js';

/**
 * Determines the winner of a match and returns a Discord-formatted result string.
 *
 * Looks up whether p1's choice beats p2's or vice versa in the RPSChoices registry.
 * If neither choice beats the other, the result is a tie.
 *
 * @param {{ id: string, objectName: string }} p1 - The challenger (player 1).
 * @param {{ id: string, objectName: string }} p2 - The acceptor (player 2).
 * @returns {string} Discord mention string describing the outcome.
 */
export function getResult(p1, p2) {
  let gameResult;

  if (RPSChoices[p1.objectName]?.[p2.objectName]) {
    // p1's choice has a registered win over p2's choice
    gameResult = {
      win: p1,
      lose: p2,
      verb: RPSChoices[p1.objectName][p2.objectName],
    };
  } else if (RPSChoices[p2.objectName]?.[p1.objectName]) {
    // p2's choice has a registered win over p1's choice
    gameResult = {
      win: p2,
      lose: p1,
      verb: RPSChoices[p2.objectName][p1.objectName],
    };
  } else {
    // Neither choice beats the other — tie
    gameResult = { win: p1, lose: p2, verb: 'tie' };
  }

  return formatResult(gameResult);
}

/**
 * Formats a game result into a Discord user-mention string.
 *
 * @param {{ win: {id: string, objectName: string}, lose: {id: string, objectName: string}, verb: string }} result
 * @returns {string} Human-readable result with Discord @mentions.
 */
function formatResult(result) {
  const { win, lose, verb } = result;
  return verb === 'tie'
    ? `<@${win.id}> and <@${lose.id}> draw with **${win.objectName}**`
    : `<@${win.id}>'s **${win.objectName}** ${verb} <@${lose.id}>'s **${lose.objectName}**`;
}

/**
 * The game choice registry. Each top-level key is a valid choice name.
 *
 * Structure: RPSChoices[winner][loser] = verb
 *   - Nested keys are the choices this option BEATS.
 *   - Values are the action verbs used in the result string.
 *   - `description` is flavor text shown in the Discord select menu.
 *
 * Balance rule: each choice beats exactly 3 others and loses to the remaining 3.
 */
const RPSChoices = {
  rock: {
    description: 'sedimentary, igneous, or perhaps even metamorphic',
    virus: 'outwaits',
    computer: 'smashes',
    scissors: 'crushes',
  },
  cowboy: {
    description: 'yeehaw~',
    scissors: 'puts away',
    wumpus: 'lassos',
    rock: 'steel-toe kicks',
  },
  scissors: {
    description: 'careful ! sharp ! edges !!',
    paper: 'cuts',
    computer: 'cuts cord of',
    virus: 'cuts DNA of',
  },
  virus: {
    description: 'genetic mutation, malware, or something inbetween',
    cowboy: 'infects',
    computer: 'corrupts',
    wumpus: 'infects',
  },
  computer: {
    description: 'beep boop beep bzzrrhggggg',
    cowboy: 'overwhelms',
    paper: 'uninstalls firmware for',
    wumpus: 'deletes assets for',
  },
  wumpus: {
    description: 'the purple Discord fella',
    paper: 'draws picture on',
    rock: 'paints cute face on',
    scissors: 'admires own reflection in',
  },
  paper: {
    description: 'versatile and iconic',
    virus: 'ignores',
    cowboy: 'gives papercut to',
    rock: 'covers',
  },
};

/**
 * Returns an array of all valid choice names from the registry.
 *
 * @returns {string[]} Array of choice keys (e.g. ["rock", "cowboy", "scissors", ...]).
 */
export function getRPSChoices() {
  return Object.keys(RPSChoices);
}

/**
 * Builds the options array for a Discord string select component, shuffled randomly
 * so no choice always appears in the same position.
 *
 * @returns {Array<{label: string, value: string, description: string}>}
 *   Options formatted for Discord's string select component spec.
 */
export function getShuffledOptions() {
  return getRPSChoices()
    .map((c) => ({
      label: capitalize(c),
      value: c.toLowerCase(),
      description: RPSChoices[c]['description'],
    }))
    // Array.sort with Math.random()-0.5 produces a random ordering each call
    .sort(() => Math.random() - 0.5);
}
