/**
 * WhatsApp Voice Note Processing Service
 *
 * Handles voice note transcription and content extraction for WhatsApp group monitors.
 * Integrates with transcription service and analysis service to extract tasks, notes, and ideas.
 */

import { transcribeAudio } from './transcriptionService';
import { analyzeTranscription } from './analysisService';
import GroupMonitor from '../models/GroupMonitor';
import Task from '../models/Task';
import Note from '../models/Note';
import Idea from '../models/Idea';
import Location from '../models/Location';
import mongoose from 'mongoose';

interface VoiceProcessingResult {
  success: boolean;
  transcription?: string;
  language?: string;
  tasksCreated: number;
  notesCreated: number;
  ideasCreated: number;
  locationsCreated: number;
  error?: string;
}

interface LocationMatch {
  text: string;
  confidence: number;
  coordinates?: {
    lat: number;
    lng: number;
  };
}

class WhatsAppVoiceProcessingService {
  /**
   * Process a voice note from WhatsApp group
   * @param localFilePath Path to downloaded voice file
   * @param groupId WhatsApp group ID
   * @param messageId WhatsApp message ID
   * @param senderId Sender's WhatsApp ID
   * @param senderName Sender's display name
   * @returns Processing result with created items count
   */
  async processVoiceNote(
    localFilePath: string,
    groupId: string,
    messageId: string,
    senderId: string,
    senderName: string
  ): Promise<VoiceProcessingResult> {
    console.log('[WhatsAppVoiceService] 🎙️ Starting voice note processing:', {
      groupId,
      messageId,
      senderId,
      senderName,
      filePath: localFilePath
    });

    try {
      // Step 1: Check if group has active monitor with voice processing enabled
      const monitors = await GroupMonitor.find({
        groupId: groupId,
        isActive: true,
        'settings.processVoiceNotes': true
      }).populate('userId');

      if (monitors.length === 0) {
        console.log('[WhatsAppVoiceService] ℹ️ No active monitors with voice processing enabled for group:', groupId);
        return {
          success: false,
          tasksCreated: 0,
          notesCreated: 0,
          ideasCreated: 0,
          locationsCreated: 0,
          error: 'No active voice processing monitor'
        };
      }

      console.log('[WhatsAppVoiceService] ✅ Found', monitors.length, 'monitor(s) with voice processing enabled');

      // Step 2: Transcribe the audio
      console.log('[WhatsAppVoiceService] 📝 Transcribing audio file...');
      let transcription: string;
      try {
        transcription = await transcribeAudio(localFilePath);
        console.log('[WhatsAppVoiceService] ✅ Transcription successful:', transcription.substring(0, 100) + '...');
      } catch (transcriptionError: any) {
        console.error('[WhatsAppVoiceService] ❌ Transcription failed:', transcriptionError);
        return {
          success: false,
          tasksCreated: 0,
          notesCreated: 0,
          ideasCreated: 0,
          locationsCreated: 0,
          error: `Transcription failed: ${transcriptionError.message}`
        };
      }

      // Step 3: Detect language (basic Hebrew/English detection)
      const language = this.detectLanguage(transcription);
      console.log('[WhatsAppVoiceService] 🌐 Detected language:', language);

      // Step 4: Extract location if mentioned
      const locationMatch = await this.extractLocation(transcription);
      let locationsCreated = 0;

      if (locationMatch) {
        console.log('[WhatsAppVoiceService] 📍 Location detected:', locationMatch);

        // Create location for each monitor's user
        for (const monitor of monitors) {
          try {
            await Location.create({
              userId: monitor.userId,
              name: locationMatch.text,
              coordinates: locationMatch.coordinates,
              description: `From WhatsApp voice: "${transcription.substring(0, 100)}..."`,
              source: 'whatsapp_voice',
              metadata: {
                groupId,
                messageId,
                senderId,
                senderName,
                confidence: locationMatch.confidence
              }
            });
            locationsCreated++;
          } catch (error) {
            console.error('[WhatsAppVoiceService] ❌ Failed to create location:', error);
          }
        }
      }

      // Step 5: Analyze transcription to extract tasks, notes, and ideas
      console.log('[WhatsAppVoiceService] 🧠 Analyzing transcription for content extraction...');
      let analysis: any;
      try {
        analysis = await analyzeTranscription(transcription);
        console.log('[WhatsAppVoiceService] ✅ Analysis complete:', {
          tasks: analysis.tasks?.length || 0,
          notes: analysis.notes?.length || 0,
          ideas: analysis.ideas?.length || 0
        });
      } catch (analysisError: any) {
        console.error('[WhatsAppVoiceService] ❌ Analysis failed:', analysisError);
        // Continue with empty analysis rather than failing
        analysis = { tasks: [], notes: [], ideas: [] };
      }

      // Step 6: Create items for each monitor's user
      let tasksCreated = 0;
      let notesCreated = 0;
      let ideasCreated = 0;

      for (const monitor of monitors) {
        const userId = monitor.userId._id || monitor.userId;

        // Create tasks
        if (Array.isArray(analysis.tasks)) {
          for (const taskText of analysis.tasks) {
            try {
              await Task.create({
                userId,
                title: taskText,
                description: `From WhatsApp voice by ${senderName}`,
                status: 'pending',
                priority: 'medium',
                source: 'whatsapp_voice',
                metadata: {
                  groupId,
                  groupName: monitor.groupName,
                  messageId,
                  senderId,
                  senderName,
                  transcription
                }
              });
              tasksCreated++;
            } catch (error) {
              console.error('[WhatsAppVoiceService] ❌ Failed to create task:', error);
            }
          }
        }

        // Create notes
        if (Array.isArray(analysis.notes)) {
          for (const noteText of analysis.notes) {
            try {
              await Note.create({
                userId,
                title: `WhatsApp note from ${senderName}`,
                content: noteText,
                source: 'whatsapp_voice',
                tags: ['whatsapp', 'voice', language],
                metadata: {
                  groupId,
                  groupName: monitor.groupName,
                  messageId,
                  senderId,
                  senderName,
                  transcription
                }
              });
              notesCreated++;
            } catch (error) {
              console.error('[WhatsAppVoiceService] ❌ Failed to create note:', error);
            }
          }
        }

        // Create ideas
        if (Array.isArray(analysis.ideas)) {
          for (const ideaText of analysis.ideas) {
            try {
              await Idea.create({
                userId,
                title: ideaText.substring(0, 100),
                description: ideaText,
                source: 'whatsapp_voice',
                tags: ['whatsapp', 'voice', language],
                metadata: {
                  groupId,
                  groupName: monitor.groupName,
                  messageId,
                  senderId,
                  senderName,
                  transcription
                }
              });
              ideasCreated++;
            } catch (error) {
              console.error('[WhatsAppVoiceService] ❌ Failed to create idea:', error);
            }
          }
        }
      }

      console.log('[WhatsAppVoiceService] ✅ Voice processing complete:', {
        tasksCreated,
        notesCreated,
        ideasCreated,
        locationsCreated,
        language
      });

      return {
        success: true,
        transcription,
        language,
        tasksCreated,
        notesCreated,
        ideasCreated,
        locationsCreated
      };
    } catch (error: any) {
      console.error('[WhatsAppVoiceService] ❌ Unexpected error during voice processing:', error);
      return {
        success: false,
        tasksCreated: 0,
        notesCreated: 0,
        ideasCreated: 0,
        locationsCreated: 0,
        error: error.message
      };
    }
  }

  /**
   * Detect language of transcription (basic Hebrew/English detection)
   */
  private detectLanguage(text: string): 'hebrew' | 'english' {
    // Count Hebrew characters
    const hebrewChars = (text.match(/[\u0590-\u05FF]/g) || []).length;
    // Count English letters
    const englishChars = (text.match(/[a-zA-Z]/g) || []).length;

    return hebrewChars > englishChars ? 'hebrew' : 'english';
  }

  /**
   * Extract location mentions from transcription
   * Supports both Hebrew and English location patterns
   */
  private async extractLocation(text: string): Promise<LocationMatch | null> {
    // Location patterns for Hebrew and English
    const patterns = [
      // Hebrew patterns
      /(?:מיקום|נמצא|ב)(.*?)(?:\.|,|$)/gi,
      /(?:כתובת|רחוב)(.*?)(?:\.|,|$)/gi,
      // English patterns
      /(?:location|address|at)\s+([^.,]+)/gi,
      /(?:meet\s+(?:at|in))\s+([^.,]+)/gi
    ];

    for (const pattern of patterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        const locationText = match[1]?.trim();
        if (locationText && locationText.length > 3) {
          return {
            text: locationText,
            confidence: 0.7,
            // Coordinates would need geocoding service integration
            coordinates: undefined
          };
        }
      }
    }

    return null;
  }

  /**
   * Generate feedback message for WhatsApp group
   * Supports both Hebrew and English
   */
  generateFeedbackMessage(result: VoiceProcessingResult, language: 'hebrew' | 'english'): string {
    if (!result.success) {
      return language === 'hebrew'
        ? '❌ לא הצלחתי לעבד את ההודעה הקולית'
        : '❌ Could not process voice message';
    }

    const items: string[] = [];

    if (result.tasksCreated > 0) {
      items.push(language === 'hebrew'
        ? `${result.tasksCreated} משימות`
        : `${result.tasksCreated} task${result.tasksCreated > 1 ? 's' : ''}`
      );
    }

    if (result.notesCreated > 0) {
      items.push(language === 'hebrew'
        ? `${result.notesCreated} הערות`
        : `${result.notesCreated} note${result.notesCreated > 1 ? 's' : ''}`
      );
    }

    if (result.ideasCreated > 0) {
      items.push(language === 'hebrew'
        ? `${result.ideasCreated} רעיונות`
        : `${result.ideasCreated} idea${result.ideasCreated > 1 ? 's' : ''}`
      );
    }

    if (result.locationsCreated > 0) {
      items.push(language === 'hebrew'
        ? `${result.locationsCreated} מיקומים`
        : `${result.locationsCreated} location${result.locationsCreated > 1 ? 's' : ''}`
      );
    }

    if (items.length === 0) {
      return language === 'hebrew'
        ? '✅ הודעה קולית תומללה, אך לא נמצא תוכן לשמירה'
        : '✅ Voice message transcribed, but no actionable content found';
    }

    const itemsList = items.join(language === 'hebrew' ? ', ' : ', ');

    return language === 'hebrew'
      ? `✅ הודעה קולית עובדה בהצלחה!\nנוצרו: ${itemsList}`
      : `✅ Voice message processed successfully!\nCreated: ${itemsList}`;
  }
}

export default WhatsAppVoiceProcessingService;
