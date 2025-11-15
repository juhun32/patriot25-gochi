package main

import (
	"context"
	"fmt"
)

type App struct {
	ctx       context.Context
	Tasks     []string
	Completed int
}

func NewApp() *App {
	return &App{
		Tasks:     []string{},
		Completed: 0,
	}
}

func (a *App) Startup(ctx context.Context) {
	a.ctx = ctx
	a.Tasks = []string{}
	a.Completed = 0
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
	
	// Remove task at index
	a.Tasks = append(a.Tasks[:index], a.Tasks[index+1:]...)
	a.Completed++
	
	fmt.Printf("Task completed. Remaining tasks: %d, Total completed: %d\n", len(a.Tasks), a.Completed)
	return nil
}

func (a *App) GetTasks() []string {
	return a.Tasks
}

func (a *App) Mood() string {
	totalTasks := len(a.Tasks)
	
	// No tasks completed yet
	if a.Completed == 0 {
		if totalTasks == 0 {
			return "Neutral."
		}
		return "Sad :("
	}
	
	// Calculate completion ratio
	if totalTasks == 0 {
		// All tasks completed!
		return "Happy!"
	}
	
	// If more tasks completed than remaining
	if a.Completed > totalTasks {
		return "Happy!"
	}
	
	// If about half done
	if a.Completed >= totalTasks/2 {
		return "Getting better..."
	}
	
	return "Keep going!"
}