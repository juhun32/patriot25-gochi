import React, { useState, useEffect } from 'react';
import { AddTask, CompleteTask, Mood } from '../wailsjs/go/main/App.js';
import './style.css';

export default function App() {
  const [tasks, setTasks] = useState([]);
  const [mood, setMood] = useState('Neutral.');
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    // Get initial mood on mount
    Mood().then(setMood).catch(console.error);
  }, []);

  const addTask = async () => {
    if (inputValue.trim()) {
      try {
        await AddTask(inputValue);
        setTasks([...tasks, inputValue]);
        const newMood = await Mood();
        setMood(newMood);
        setInputValue('');
      } catch (error) {
        console.error('Error adding task:', error);
      }
    }
  };

  const completeTask = async (index) => {
    try {
      await CompleteTask(index);
      const newTasks = tasks.filter((_, i) => i !== index);
      setTasks(newTasks);
      const newMood = await Mood();
      setMood(newMood);
    } catch (error) {
      console.error('Error completing task:', error);
    }
  };

  const getMoodEmoji = () => {
    if (mood.includes('Happy')) return '🐶';
    if (mood.includes('Sad')) return '😢';
    return '😐';
  };

  return (
    <div id="pet">
      <div className="pet-header">
        <h1 className="pet-title">Gochi!</h1>
        <div className="mood-display">
          <span className="mood-emoji">{getMoodEmoji()}</span>
          <span className="mood-text">{mood}</span>
        </div>
      </div>

      <div className="task-input-container">
        <input
          type="text"
          className="task-input"
          placeholder="What needs to be done?"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && addTask()}
        />
        <button className="add-btn" onClick={addTask}>+</button>
      </div>

      <div className="tasks-container">
        {tasks.length === 0 ? (
          <p className="no-tasks">No tasks yet! Add one to get started.</p>
        ) : (
          <ul className="task-list">
            {tasks.map((task, index) => (
              <li key={index} className="task-item">
                <span className="task-text">{task}</span>
                <button 
                  className="complete-btn" 
                  onClick={() => completeTask(index)}
                  title="Mark as complete"
                >
                  ✓
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="task-count">
        {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'} remaining
      </div>
    </div>
  );
}