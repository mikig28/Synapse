"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MeetingAnalysisService = void 0;
const Task_1 = __importDefault(require("../models/Task"));
const Note_1 = __importDefault(require("../models/Note"));
class MeetingAnalysisService {
    /**
     * Analyze meeting transcription and extract summary, highlights, tasks, and notes
     */
    static async analyzeMeetingTranscription(transcription) {
        try {
            // This is a simplified analysis - in a real implementation, you would use
            // an AI service like OpenAI GPT, Claude, or a local LLM
            const analysis = await this.performAIAnalysis(transcription);
            return analysis;
        }
        catch (error) {
            console.error('[MeetingAnalysisService]: Error analyzing transcription:', error);
            throw new Error('Failed to analyze meeting transcription');
        }
    }
    /**
     * Create tasks and notes from extracted items and link them to the meeting
     */
    static async createExtractedItems(meeting, analysis) {
        const createdTasks = [];
        const createdNotes = [];
        try {
            // Create tasks from extracted action items
            for (const taskData of analysis.extractedTasks) {
                const task = new Task_1.default({
                    userId: meeting.userId,
                    title: taskData.title,
                    description: taskData.description,
                    priority: taskData.priority,
                    status: 'pending',
                    source: 'meeting',
                    rawTranscription: meeting.transcription,
                });
                const savedTask = await task.save();
                createdTasks.push(savedTask._id);
                // Update meeting with task reference
                meeting.extractedTasks = meeting.extractedTasks || [];
                meeting.extractedTasks.push({
                    title: taskData.title,
                    description: taskData.description,
                    priority: taskData.priority,
                    taskId: savedTask._id,
                });
            }
            // Create notes from extracted important information
            for (const noteData of analysis.extractedNotes) {
                const note = new Note_1.default({
                    userId: meeting.userId,
                    content: noteData.content,
                    source: 'meeting',
                    rawTranscription: meeting.transcription,
                });
                const savedNote = await note.save();
                createdNotes.push(savedNote._id);
                // Update meeting with note reference
                meeting.extractedNotes = meeting.extractedNotes || [];
                meeting.extractedNotes.push({
                    content: noteData.content,
                    noteId: savedNote._id,
                });
            }
            return { createdTasks, createdNotes };
        }
        catch (error) {
            console.error('[MeetingAnalysisService]: Error creating extracted items:', error);
            throw new Error('Failed to create tasks and notes from meeting');
        }
    }
    /**
     * Perform AI analysis on the transcription
     * This is a placeholder implementation - replace with actual AI service
     */
    static async performAIAnalysis(transcription) {
        // Simulate AI processing delay
        await new Promise(resolve => setTimeout(resolve, 2000));
        // This is a mock implementation - replace with actual AI analysis
        const words = transcription.split(' ');
        const sentences = transcription.split(/[.!?]+/).filter(s => s.trim().length > 0);
        // Generate mock summary
        const summary = this.generateMockSummary(transcription);
        // Extract mock highlights
        const keyHighlights = this.extractMockHighlights(sentences);
        // Extract mock tasks
        const extractedTasks = this.extractMockTasks(transcription);
        // Extract mock notes
        const extractedNotes = this.extractMockNotes(sentences);
        return {
            summary,
            keyHighlights,
            extractedTasks,
            extractedNotes,
        };
    }
    static generateMockSummary(transcription) {
        const wordCount = transcription.split(' ').length;
        const estimatedDuration = Math.ceil(wordCount / 150); // Assuming 150 words per minute
        return `Meeting summary: This ${estimatedDuration}-minute discussion covered key topics and decisions. ` +
            `The conversation included ${Math.ceil(wordCount / 100)} main discussion points with actionable outcomes. ` +
            `Important decisions were made and follow-up actions were identified for team members.`;
    }
    static extractMockHighlights(sentences) {
        const highlights = [];
        // Look for sentences with decision-making keywords
        const decisionKeywords = ['decided', 'agreed', 'concluded', 'resolved', 'determined'];
        const importantKeywords = ['important', 'critical', 'urgent', 'priority', 'deadline'];
        sentences.forEach(sentence => {
            const lowerSentence = sentence.toLowerCase();
            if (decisionKeywords.some(keyword => lowerSentence.includes(keyword)) ||
                importantKeywords.some(keyword => lowerSentence.includes(keyword))) {
                if (sentence.trim().length > 20 && sentence.trim().length < 200) {
                    highlights.push(sentence.trim());
                }
            }
        });
        // If no highlights found, create some generic ones
        if (highlights.length === 0) {
            highlights.push('Key decisions were made during the meeting');
            highlights.push('Action items were identified for follow-up');
            highlights.push('Important topics were discussed and resolved');
        }
        return highlights.slice(0, 5); // Limit to 5 highlights
    }
    static extractMockTasks(transcription) {
        const tasks = [];
        // Look for action-oriented phrases
        const actionKeywords = [
            'need to', 'should', 'must', 'will', 'action item', 'follow up',
            'task', 'assignment', 'responsible for', 'deadline', 'due'
        ];
        const sentences = transcription.split(/[.!?]+/).filter(s => s.trim().length > 0);
        sentences.forEach(sentence => {
            const lowerSentence = sentence.toLowerCase();
            if (actionKeywords.some(keyword => lowerSentence.includes(keyword))) {
                if (sentence.trim().length > 10 && sentence.trim().length < 150) {
                    const priority = this.determinePriority(sentence);
                    tasks.push({
                        title: this.extractTaskTitle(sentence),
                        description: sentence.trim(),
                        priority,
                    });
                }
            }
        });
        // If no tasks found, create some generic ones
        if (tasks.length === 0) {
            tasks.push({
                title: 'Follow up on meeting decisions',
                description: 'Review and implement the decisions made during the meeting',
                priority: 'medium',
            });
        }
        return tasks.slice(0, 10); // Limit to 10 tasks
    }
    static extractMockNotes(sentences) {
        const notes = [];
        // Look for informational content
        const infoKeywords = [
            'note that', 'remember', 'important', 'key point', 'mentioned',
            'discussed', 'explained', 'clarified', 'information'
        ];
        sentences.forEach(sentence => {
            const lowerSentence = sentence.toLowerCase();
            if (infoKeywords.some(keyword => lowerSentence.includes(keyword))) {
                if (sentence.trim().length > 20 && sentence.trim().length < 300) {
                    notes.push({
                        content: sentence.trim(),
                    });
                }
            }
        });
        // If no notes found, create some generic ones
        if (notes.length === 0) {
            notes.push({
                content: 'Important information was shared during the meeting',
            });
        }
        return notes.slice(0, 8); // Limit to 8 notes
    }
    static determinePriority(sentence) {
        const lowerSentence = sentence.toLowerCase();
        if (lowerSentence.includes('urgent') || lowerSentence.includes('asap') ||
            lowerSentence.includes('immediately') || lowerSentence.includes('critical')) {
            return 'high';
        }
        if (lowerSentence.includes('soon') || lowerSentence.includes('priority') ||
            lowerSentence.includes('important')) {
            return 'medium';
        }
        return 'low';
    }
    static extractTaskTitle(sentence) {
        // Extract a concise title from the sentence
        const words = sentence.trim().split(' ');
        if (words.length <= 8) {
            return sentence.trim();
        }
        // Take first 8 words and add ellipsis
        return words.slice(0, 8).join(' ') + '...';
    }
}
exports.MeetingAnalysisService = MeetingAnalysisService;
