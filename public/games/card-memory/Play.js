import { createCard } from "./createCard.js";

/**
 * Card Memory Game by Francisco Pereira (Gammafp)
 * -----------------------------------------------
 *
 * Test your memory skills in this classic game of matching pairs.
 * Flip over cards to reveal pictures, and try to remember where each image is located.
 * Match all the pairs to win!
 *
 * Music credits:
 * "Fat Caps" by Audionautix is licensed under the Creative Commons Attribution 4.0 license. https://creativecommons.org/licenses/by/4.0/
 * Artist http://audionautix.com/
 */
export class Play extends Phaser.Scene
{
    // All cards names
    cardNames = ["card-0", "card-1", "card-2", "card-3", "card-4", "card-5"];
    // Cards Game Objects
    cards = [];

    // History of card opened
    cardOpened = undefined;

    // Can play the game
    canMove = false;

    // Game variables
    lives = 0;

    // Grid configuration
    gridConfiguration = {
        x: 113,
        y: 102,
        paddingX: 10,
        paddingY: 10
    }

    constructor ()
    {
        super({
            key: 'Play'
        });
    }

    init ()
    {
        // Fadein camera
        this.cameras.main.fadeIn(500);
        this.lives = 10;
    }

    create ()
    {
        // Background
        this.add.image(0, 0, "background").setOrigin(0, 0);

        // Create cards
        this.createCards();

        // UI
        this.createUI();

        // Start the game
        this.startGame();

        // Music
        this.sound.play("theme-song", { loop: true, volume: 0.3 });
    }

    createCards ()
    {
        // Create pairs of cards
        const pairs = [...this.cardNames, ...this.cardNames];
        
        // Shuffle the pairs
        for (let i = pairs.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [pairs[i], pairs[j]] = [pairs[j], pairs[i]];
        }

        // Create card objects
        let cardIndex = 0;
        for (let row = 0; row < 3; row++) {
            for (let col = 0; col < 4; col++) {
                const x = this.gridConfiguration.x + (col * (80 + this.gridConfiguration.paddingX));
                const y = this.gridConfiguration.y + (row * (100 + this.gridConfiguration.paddingY));
                
                const card = createCard({
                    scene: this,
                    x: x,
                    y: y,
                    frontTexture: pairs[cardIndex],
                    cardName: pairs[cardIndex]
                });

                card.gameObject.on('pointerdown', () => {
                    this.onCardClick(card);
                });

                this.cards.push(card);
                cardIndex++;
            }
        }
    }

    createUI ()
    {
        // Lives display
        this.livesText = this.add.text(50, 50, `Lives: ${this.lives}`, {
            fontSize: '24px',
            color: '#ffffff',
            fontFamily: 'Arial'
        });

        // Instructions
        this.add.text(50, 400, 'Click cards to flip them and find matching pairs!', {
            fontSize: '16px',
            color: '#ffffff',
            fontFamily: 'Arial'
        });
    }

    startGame ()
    {
        this.canMove = true;
    }

    onCardClick (card)
    {
        if (!this.canMove || card.gameObject.alpha < 1) {
            return;
        }

        // Flip the card
        card.flip(() => {
            this.handleCardFlip(card);
        });
    }

    handleCardFlip (card)
    {
        if (this.cardOpened === undefined) {
            // First card
            this.cardOpened = card;
        } else {
            // Second card
            this.canMove = false;
            
            if (this.cardOpened.cardName === card.cardName) {
                // Match found!
                this.sound.play("card-match");
                this.cardOpened = undefined;
                this.canMove = true;
                
                // Check if all cards are matched
                this.checkWinCondition();
            } else {
                // No match
                this.sound.play("card-mismatch");
                this.lives--;
                this.livesText.setText(`Lives: ${this.lives}`);
                
                // Flip both cards back after a delay
                this.time.delayedCall(1000, () => {
                    this.cardOpened.flip();
                    card.flip(() => {
                        this.cardOpened = undefined;
                        this.canMove = true;
                    });
                });
            }
        }
    }

    checkWinCondition ()
    {
        const remainingCards = this.cards.filter(card => card.gameObject.alpha === 1);
        if (remainingCards.length === 0) {
            this.gameWon();
        } else if (this.lives <= 0) {
            this.gameOver();
        }
    }

    gameWon ()
    {
        this.canMove = false;
        this.sound.play("victory");
        
        // Show victory message
        this.add.text(275, 240, 'YOU WIN!', {
            fontSize: '48px',
            color: '#00ff00',
            fontFamily: 'Arial',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);
    }

    gameOver ()
    {
        this.canMove = false;
        
        // Show game over message
        this.add.text(275, 240, 'GAME OVER', {
            fontSize: '48px',
            color: '#ff0000',
            fontFamily: 'Arial',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);
    }
}
