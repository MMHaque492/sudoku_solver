// solver.cpp
#pragma GCC optimize("O3,unroll-loops")
#pragma GCC target("avx2,bmi,bmi2,lzcnt,popcnt")
#include <iostream>
#include <vector>
#include <chrono>

using namespace std;
using namespace std::chrono;

int row_mask[9], col_mask[9], grid_mask[9];

inline int getGridPos(int r, int c) { return (r / 3) * 3 + (c / 3); }

bool solve(vector<vector<int>>& board, int r, int c) {
    if (r == 9) return true;
    if (c == 9) return solve(board, r + 1, 0);
    if (board[r][c] != 0) return solve(board, r, c + 1);

    int g = getGridPos(r, c);
    int mask = ~(row_mask[r] | col_mask[c] | grid_mask[g]) & 0x3FE;

    while (mask) {
        int num = __builtin_ctz(mask);
        int bit = 1 << num;
        
        row_mask[r] |= bit; col_mask[c] |= bit; grid_mask[g] |= bit;
        board[r][c] = num;

        if (solve(board, r, c + 1)) return true;

        row_mask[r] &= ~bit; col_mask[c] &= ~bit; grid_mask[g] &= ~bit;
        board[r][c] = 0;
        mask &= mask - 1;
    }
    return false;
}

int main() {
    ios_base::sync_with_stdio(false);
    cin.tie(NULL);

    vector<vector<int>> board(9, vector<int>(9));
    for (int i = 0; i < 9; i++) {
        for (int j = 0; j < 9; j++) {
            cin >> board[i][j];
            if (board[i][j] != 0) {
                int bit = 1 << board[i][j];
                row_mask[i] |= bit;
                col_mask[j] |= bit;
                grid_mask[getGridPos(i, j)] |= bit;
            }
        }
    }

    auto start = high_resolution_clock::now();
    bool solved = solve(board, 0, 0);
    auto end = high_resolution_clock::now();
    double time_taken = duration_cast<nanoseconds>(end - start).count() / 1e6;

    if (solved) {
        for (int i = 0; i < 9; i++) {
            for (int j = 0; j < 9; j++) cout << board[i][j] << " ";
            cout << "\n";
        }
        cout << fixed << time_taken << "\n";
    } else {
        cout << "NOSOLUTION\n";
    }
    return 0;
}