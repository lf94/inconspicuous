interface StegoKey extends String { }
type EmptyKey = '';

interface StegoFile extends String { }
type CoverFile = StegoFile;

interface Message extends Uint8Array { }

type BitIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

// It's unacceptable to return partial keys, so we return an empty key when we cannot fully hide a message.
function hide(cover: CoverFile, input: Message): [StegoFile, StegoKey | EmptyKey] {
    let words = cover.split(' ');
    const wordsLength = words.length;
    let key = '';

    const bits = input.reduce((bits, byte) => {
        for (let index: BitIndex = 7; index >= 0; index--) {
            bits.push((byte >> index) & 0x01);
        }
        return bits;
    }, []);

    const bitsLength = bits.length;
    let bitIndex = 0;

    while (bitIndex < bitsLength) {
        const wordIndex = words.findIndex(word => word[0] !== word[word.length - 1]);
        if (wordIndex < 0) {
            return [cover, ''];
        }

        const word = words[wordIndex];
        const letterRounds = parseInt(`${word.length / 2}`);

        for (let letterIndex = 0; letterIndex < letterRounds; letterIndex++) {
            const frontalLetter = word[letterIndex];
            const posteriorLetter = word[(word.length - 1) - letterIndex];

            if (frontalLetter === posteriorLetter) {
                continue;
            }

            const bit = bits[bitIndex];
            bitIndex++;
            if (bitIndex > bitsLength) {
                break;
            }
             
            key += bit === 0 ? frontalLetter : posteriorLetter;
        }

        words = words.slice(wordIndex + 1);
    }

    return [cover, key];
}

// Tries best-effort to decode the file
function seek([file, key]: [StegoFile, StegoKey]): Message {
    let words: string[] = file.split(' ');
    const wordsLength = words.length;
    const keyLength = key.length;

    let keyIndex = 0;
    let messageIndex = 0;

    let message = new Uint8Array(keyLength / 8);
    let byte = 0;

    while (keyIndex < keyLength) {
        const wordIndex = words.findIndex(word => word[0] !== word[word.length - 1]);

        if (wordIndex < 0) {
            return message;
        }
        
        const word = words[wordIndex];
        const letterRounds = parseInt(`${word.length / 2}`);

        for (let letterIndex = 0; letterIndex < letterRounds; letterIndex++) {
            const frontalLetter = word[letterIndex];
            const posteriorLetter = word[(word.length - 1) - letterIndex];

            if (frontalLetter === posteriorLetter) {
                continue;
            }

            const keyCharacter = key[keyIndex];

            byte = (byte << 1);

            if (keyCharacter === frontalLetter) {
                byte |= 0;
            }

            if (keyCharacter === posteriorLetter) {
                byte |= 1;
            }

            keyIndex++;

            if (keyIndex % 8 === 0) {
                message[messageIndex++] = byte;
                byte = 0;
            }

            if (keyIndex > keyLength) {
                break;
            }
        }

        words = words.slice(wordIndex + 1);
    }

    return message;
}

const cover = "Nearly ten years had passed since the Dursleys had woken up to find their nephew on the front step, but Privet Drive had hardly changed at all. The sun rose on the same tidy front gardens and lit up the brass number four on the Dursleys' front door; it crept into their living room, which was almost exactly the same as it had been on the night when Mr. Dursley had seen that fateful news report about the owls. Only the photographs on the mantelpiece really showed how much time had passed. Ten years ago, there had been lots of pictures of what looked like a large pink beach ball wearing different-colored bonnets - but Dudley Dursley was no longer a baby, and now the photographs showed a large blond boy riding his first bicycle, on a carousel at the fair, playing a computer game with his father, being hugged and kissed by his mother. The room held no sign at all that another boy lived in the house, too.";
const input = "Hey inner circle, what's up?";
const encoder = new TextEncoder();
const decoder = new TextDecoder();
const encoded = encoder.encode(input);
const decoded = decoder.decode(seek(hide(cover, encoded)));
console.log(input, decoded);
