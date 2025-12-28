import random

print("================================")
print("Rock Paper Scissors Lizard Spock")
print("================================\n")

print("1) Rock")
print("2) Paper")
print("3) Scissors")
print("4) Lizard")
print("5) Spock")

choices = {
    1: "Rock",
    2: "Paper",
    3: "Scissors",
    4: "Lizard",
    5: "Spock"
}

choice = int(input("\nPick a number: "))

while choice < 1 or choice > 5:
    choice = int(input("Invalid choice. Please enter a number between 1 and 5: "))

enemy = random.randint(1, 5)

print(f"\nYou chose: {choices[choice]}")
print(f"CPU chose: {choices[enemy]}")

def roshambo_winner(player1, player2):
    if player1 == player2:
        return 'tie'
    rules = {
        1: [3, 4],  # Rock crushes Scissors, crushes Lizard
        2: [1, 5],  # Paper covers Rock, disproves Spock
        3: [2, 4],  # Scissors cuts Paper, decapitates Lizard
        4: [2, 5],  # Lizard eats Paper, poisons Spock
        5: [1, 3]   # Spock smashes Scissors, vaporizes Rock
    }
    if player2 in rules[player1]:
        return 'Player 1!'
    else:
        return 'Player 2!'

winner = roshambo_winner(choice, enemy)
if winner == 'tie':
    print("It's a tie!")
else:
    print(f"The winner is: {winner}")

