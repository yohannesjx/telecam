package alertdelivery

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// TelegramClient sends messages via the Telegram Bot API.
type TelegramClient struct {
	token      string
	chatID     string
	httpClient *http.Client
}

// NewTelegramClient creates a Telegram sender. token must not be logged.
func NewTelegramClient(token, chatID string) *TelegramClient {
	return &TelegramClient{
		token:  token,
		chatID: chatID,
		httpClient: &http.Client{
			Timeout: 20 * time.Second,
		},
	}
}

type sendMessageRequest struct {
	ChatID string `json:"chat_id"`
	Text   string `json:"text"`
}

type sendMessageResponse struct {
	OK          bool   `json:"ok"`
	Description string `json:"description"`
}

// SendMessage posts a plain-text message to the configured chat.
func (c *TelegramClient) SendMessage(ctx context.Context, text string) error {
	body, err := json.Marshal(sendMessageRequest{
		ChatID: c.chatID,
		Text:   text,
	})
	if err != nil {
		return fmt.Errorf("marshal telegram body: %w", err)
	}

	url := fmt.Sprintf("https://api.telegram.org/bot%s/sendMessage", c.token)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("create telegram request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("telegram request failed: %w", err)
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(io.LimitReader(resp.Body, 4096))
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("telegram HTTP %d: %s", resp.StatusCode, truncate(string(respBody), 200))
	}

	var parsed sendMessageResponse
	if err := json.Unmarshal(respBody, &parsed); err == nil && !parsed.OK {
		return fmt.Errorf("telegram API error: %s", parsed.Description)
	}
	return nil
}

func truncate(s string, max int) string {
	if len(s) <= max {
		return s
	}
	return s[:max] + "..."
}
