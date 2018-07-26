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
    const inputLength = input.length;
    let key = '';

    for (let inputIndex = 0; inputIndex < inputLength; inputIndex++) {
        const byte = input[inputIndex];

        for (let index: BitIndex = 7; index >= 0; index--) {
            const bit = (byte >> index) & 0x01;

            const wordIndex = words.findIndex(word => word[0] !== word[word.length - 1]);
            if (wordIndex < 0) {
                return [cover, ''];
            }
            
            const word = words[wordIndex];
            const firstLetter = word[0];
            const lastLetter = word[word.length - 1];
            words = words.slice(wordIndex + 1);
           
            key += bit === 0 ? firstLetter : lastLetter;
        }
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
        const keyCharacter = key[keyIndex];

        const wordIndex = words.findIndex(word => word[0] !== word[word.length - 1]);

        if (wordIndex < 0) {
            return message;
        }
        
        const word = words[wordIndex];
        const firstLetter = word[0];
        const lastLetter = word[word.length - 1];
        words = words.slice(wordIndex + 1);

        byte = (byte << 1);

        if (keyCharacter === firstLetter) {
            byte |= 0;
        }

        if (keyCharacter === lastLetter) {
            byte |= 1;
        }

        keyIndex++;

        if (keyIndex % 8 === 0) {
            message[messageIndex++] = byte;
            byte = 0;
        }
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
