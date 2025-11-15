package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"sync"
	"time"
)

const (
	petStateFile         = "pet_state.json"
	hungerDecayPerMinute = 0.5 // Changed from per hour
	energyDecayPerMinute = 0.4 // Changed from per hour
	affectionPerMinute   = 0.2 // Changed from per hour
	maxStatValue         = 100
	minStatValue         = 0
	feedBoost            = 30
	treatBoost           = 20
	sleepBoost           = 40
	affectionSideBoost   = 5
)

type PetState struct {
	Hunger      int       `json:"hunger"`
	Energy      int       `json:"energy"`
	Affection   int       `json:"affection"`
	LastUpdated time.Time `json:"lastUpdated"`
}

func defaultPetState() PetState {
	return PetState{
		Hunger:      80,
		Energy:      75,
		Affection:   70,
		LastUpdated: time.Now(),
	}
}

func (ps PetState) mood() string {
	switch {
	case ps.Hunger < 30 || ps.Energy < 25:
		return "sad"
	case ps.Affection > 75 && ps.Energy > 60 && ps.Hunger > 60:
		return "golden"
	default:
		return "neutral"
	}
}

type App struct {
	ctx       context.Context
	mu        sync.Mutex
	Tasks     []string
	Completed int
	petState  PetState
}

func NewApp() *App {
	return &App{
		Tasks:     []string{},
		Completed: 0,
		petState:  defaultPetState(),
	}
}

func (a *App) Startup(ctx context.Context) {
	a.ctx = ctx
	a.Tasks = []string{}
	a.Completed = 0
	a.petState = a.loadPetState()
	a.syncPetStateLocked()
	a.savePetStateLocked()
	go a.backgroundDecay()
}

func (a *App) AddTask(task string) error {
	if task == "" {
		return fmt.Errorf("task cannot be empty")
	}
	a.Tasks = append(a.Tasks, task)
	fmt.Printf("Task added: %s. Total tasks: %d\n", task, len(a.Tasks))
	return nil
}

func (a *App) CompleteTask(index int) error {
	if index < 0 || index >= len(a.Tasks) {
		return fmt.Errorf("invalid task index: %d", index)
	}
	a.Tasks = append(a.Tasks[:index], a.Tasks[index+1:]...)
	a.Completed++
	fmt.Printf("Task completed. Remaining tasks: %d, Total completed: %d\n", len(a.Tasks), a.Completed)
	return nil
}

func (a *App) GetTasks() []string {
	return a.Tasks
}

func (a *App) Mood() string {
	state := a.GetPetState()
	return state.mood()
}

func (a *App) GetPetState() PetState {
	a.mu.Lock()
	defer a.mu.Unlock()
	a.syncPetStateLocked()
	return a.petState
}

func (a *App) FeedPet() PetState {
	a.mu.Lock()
	defer a.mu.Unlock()
	a.syncPetStateLocked()
	a.petState.Hunger = clamp(a.petState.Hunger + feedBoost)
	a.petState.Affection = clamp(a.petState.Affection + affectionSideBoost)
	a.petState.LastUpdated = time.Now()
	a.savePetStateLocked()
	return a.petState
}

func (a *App) GiveTreat() PetState {
	a.mu.Lock()
	defer a.mu.Unlock()
	a.syncPetStateLocked()
	a.petState.Affection = clamp(a.petState.Affection + treatBoost)
	a.petState.Hunger = clamp(a.petState.Hunger - 5)
	a.petState.LastUpdated = time.Now()
	a.savePetStateLocked()
	return a.petState
}

func (a *App) PutPetToSleep() PetState {
	a.mu.Lock()
	defer a.mu.Unlock()
	a.syncPetStateLocked()
	a.petState.Energy = clamp(a.petState.Energy + sleepBoost)
	a.petState.LastUpdated = time.Now()
	a.savePetStateLocked()
	return a.petState
}

func (a *App) loadPetState() PetState {
	data, err := os.ReadFile(petStateFile)
	if err != nil {
		return defaultPetState()
	}
	var state PetState
	if err := json.Unmarshal(data, &state); err != nil {
		return defaultPetState()
	}
	if state.LastUpdated.IsZero() {
		state.LastUpdated = time.Now()
	}
	return state
}

func (a *App) savePetStateLocked() {
	payload, err := json.MarshalIndent(a.petState, "", "  ")
	if err != nil {
		fmt.Println("failed to serialize pet state:", err)
		return
	}
	if err := os.WriteFile(petStateFile, payload, 0o644); err != nil {
		fmt.Println("failed to save pet state:", err)
	}
}

func (a *App) syncPetStateLocked() {
	now := time.Now()
	elapsed := now.Sub(a.petState.LastUpdated)
	if elapsed <= 0 {
		return
	}
	minutes := elapsed.Minutes()
	a.petState.Hunger = clamp(a.petState.Hunger - int(minutes*hungerDecayPerMinute))
	a.petState.Energy = clamp(a.petState.Energy - int(minutes*energyDecayPerMinute))
	a.petState.Affection = clamp(a.petState.Affection - int(minutes*affectionPerMinute))
	a.petState.LastUpdated = now
	a.savePetStateLocked()
}

func (a *App) backgroundDecay() {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()
	for {
		select {
		case <-ticker.C:
			a.mu.Lock()
			a.syncPetStateLocked()
			a.mu.Unlock()
		case <-a.ctx.Done():
			return
		}
	}
}

func clamp(value int) int {
	if value < minStatValue {
		return minStatValue
	}
	if value > maxStatValue {
		return maxStatValue
	}
	return value
}
