package hyper

import (
	"errors"
	"fmt"
	"net/url"
	"regexp"
	"strconv"
	"strings"
	"unicode/utf8"

	"github.com/awesome-gocui/gocui"
	"github.com/hypersoftware/hyper-cli/internal/imap"
	"github.com/hypersoftware/hyper-cli/internal/user"
	"github.com/hypersoftware/hyper-cli/internal/utils"
	uuid "github.com/nu7hatch/gouuid"
)

// EmailVerificationView displays the prompts for email verification  // pass:C_Furry_****?birthyear/Baka_birthyear
type EmailVerificationView struct {
	*View
	inputHidden   bool
	inputValue    string
	SelectedStore SupportedSite
	Proxies       []*url.URL
	EmailProvider imap.EmailProvider
	ImapSettings  imap.ImapSettings
	currentStep   int
	lines         []string
}

const (
	EVProvider = iota
	EVUsername
	EVPassword
	EVConfirm
)

// NewEmailVerificationView is a constructor for EmailVerificationView
func NewEmailVerificationView() *EmailVerificationView {
	return &EmailVerificationView{
		View:         NewView("email-verification", true, false),
		ImapSettings: imap.ImapSettings{},
		currentStep:  0,
	}
}

// Layout sets up the layout for EmailVerificationView
func (view *EmailVerificationView) Layout() {

	console := HyperConsole{}
	_, _ = console.SetTitle("HyperRaffle | Email Verification")

	view.SetFrame(false)
	view.Window().Wrap = true
	// Highlight selected store
	view.SetHighlight(true)
	view.SetSelFgColor(gocui.ColorCyan)
	view.CreateEmailVerificationTask()
}

// CreateEmailVerificationTask displays the prompts for the current step
func (view *EmailVerificationView) CreateEmailVerificationTask() {
	switch view.currentStep {
	case EVProvider:

		view.Clear()
		view.lines = make([]string, 0)
		view.lines = append(view.lines, fmt.Sprint(string("\033[36m"), "Selected store: ", view.SelectedStore.Name.String()))
		view.lines = append(view.lines, fmt.Sprint(string("\033[36m"), "Choose your email provider: ", "\033[0m"))
		view.Println(strings.Join(view.lines, "\n"))
		v_max_len := 20
		//line := 0
		spacer := ""
		view.Println()

		for index, provider := range imap.Providers {
			v_len := len([]rune(provider.String()))

			if index <= 9 {
				spacer = " "
			} else {
				spacer = ""
			}

			if index%3 == 2 {
				if index >= 10 {
					view.Print("\u001B[36m[", spacer, index, "] \u001B[37m", provider.String(), "\u001B[0m") // Ansi Codes: Cyan, White, Reset
				} else {
					view.Print("\u001B[36m[", spacer, index, "] \u001B[37m", provider.String(), "\u001B[0m")
				}

				view.Println()
			} else {
				if index >= 10 {
					view.Print("\u001B[36m[", spacer, index, "] \u001B[37m", provider.String(), "\u001B[0m")
				} else {
					view.Print("\u001B[36m[", spacer, index, "] \u001B[37m", provider.String(), "\u001B[0m")
				}

				for j := 0; j < v_max_len-v_len; j++ {
					view.Print(" ")
				}
			}
		}

		//view.SetFgColor(gocui.NewRGBColor(0, 0, 0x21))
		view.SetFrame(false)

		_ = view.SetCursor(len("Choose your email provider: "), 1)

		view.cursor = true
		view.Editable(true)

		view.Editor(view)

	case EVUsername:
		view.Clear()
		view.lines[1] += fmt.Sprint(view.ImapSettings.Provider.String())
		view.lines = append(view.lines, fmt.Sprint(string("\033[36m"), "Insert username: ", "\033[0m"))

		view.Println(strings.Join(view.lines, "\n"))
		_ = view.SetCursor(0, len(view.BufferLines()))

		view.window.Editor = view
		view.window.Editable = true

	case EVPassword:
		view.Clear()
		view.lines[2] += fmt.Sprint(view.ImapSettings.Username)
		view.lines = append(view.lines, fmt.Sprint(string("\033[36m"), "Insert password: ", "\033[0m"))

		view.Println(strings.Join(view.lines, "\n"))
		_ = view.SetCursor(0, len(view.BufferLines()))

		view.inputHidden = true
		view.window.Editor = view
		view.window.Editable = true

	case EVConfirm:
		view.Clear()
		view.lines = make([]string, 0)
		view.lines = append(view.lines, fmt.Sprint(string("\033[36m"), "Selected store: ", "\033[0m", view.SelectedStore.Name.String()))
		view.lines = append(view.lines, fmt.Sprint(string("\033[36m"), "Selected email provider: ", "\033[0m", view.ImapSettings.Provider.String()))
		view.lines = append(view.lines, fmt.Sprint(string("\033[36m"), "Email account username: ", "\033[0m", view.ImapSettings.Username))
		view.lines = append(view.lines, fmt.Sprint(string("\033[36m"), "Email account password: ", "\033[0m", strings.Repeat("*", utf8.RuneCountInString(view.ImapSettings.Password))))
		view.lines = append(view.lines, fmt.Sprint("Press ", string("\033[36m"), "[ENTER]", "\033[0m", " to start email verification"))
		//view.lines = append(view.lines, fmt.Sprint("Press ", string("\033[36m"), "[CTRL-Z]", "\033[0m", " to cancel"))
		view.lines = append(view.lines, fmt.Sprint("Press ", string("\033[36m"), "[TAB]", "\033[0m", " To Go Back"))
		view.Clear()
		view.Println(strings.Join(view.lines, "\n"))
		_ = view.SetCursor(0, len(view.BufferLines()))
		view.window.Editor = view
		//view.window.Editable = true
	}

}

// ExitEmailVerificationWithMessage exits from this view with an optional message
func (hyper *Hyper) ExitEmailVerificationWithMessage(errorMessage string) error {
	hyper.Views.EmailVerification.lines = nil
	hyper.Views.EmailVerification.Proxies = []*url.URL{}
	hyper.Views.EmailVerification.currentStep = EVProvider

	hyper.Views.TaskCreation.currentStep = TCSelectedSiteMode
	hyper.Views.TaskCreation.TaskLink = ""
	hyper.Views.TaskCreation.SelectedSite = hyper.Views.EmailVerification.SelectedStore
	hyper.Views.TaskCreation.CSVPath = ""
	hyper.Views.TaskCreation.ProxyPath = ""
	hyper.Views.TaskCreation.Profiles = []user.Profile{}
	hyper.Views.TaskCreation.Proxies = []*url.URL{}
	err := hyper.SidebarSetPage("Task Creation")
	if err != nil {
		return err
	}
	hyper.DisplayError(errorMessage)
	return nil
}

// ResetEmailVerificationAndExit resets the state of emailverification view and goes back to sidebar
func (hyper *Hyper) ResetEmailVerificationAndExit() error {
	err := hyper.ResetEmailVerification()
	if err != nil {
		return err
	}
	hyper.ShowSidebar()
	return nil
}

// ResetEmailVerification resets the state of emailverification view
func (hyper *Hyper) ResetEmailVerification() error {
	view := hyper.Views.EmailVerification

	view.Clear()
	view.lines = make([]string, 0)
	view.Proxies = []*url.URL{}
	view.currentStep = EVProvider
	view.SelectedStore = SupportedSite{}
	view.ImapSettings = imap.ImapSettings{}
	view.inputValue = ""
	hyper.gui.Update(func(g *gocui.Gui) error {
		hyper.DeleteKeyBinding(view, gocui.KeyEsc, gocui.ModNone)
		hyper.DeleteKeyBinding(view, gocui.KeyArrowLeft, gocui.ModNone)
		hyper.DeleteKeyBinding(view, gocui.KeyArrowRight, gocui.ModNone)
		hyper.DeleteKeyBinding(view, gocui.KeyArrowUp, gocui.ModNone)
		hyper.DeleteKeyBinding(view, gocui.KeyArrowDown, gocui.ModNone)
		hyper.DeleteKeyBinding(view, gocui.KeyEnter, gocui.ModNone)

		err := hyper.SetKeybinding(hyper.Views.EmailVerification, gocui.KeyEnter, gocui.ModNone, hyper.fnWrap(hyper.EmailVerificationTaskInputNext))
		if err != nil {
			return err
		}
		err = hyper.SetKeybinding(hyper.Views.EmailVerification, gocui.KeyArrowUp, gocui.ModNone, hyper.fnWrap(hyper.SelectUp(hyper.Views.EmailVerification, 1)))
		if err != nil {
			return err
		}
		err = hyper.SetKeybinding(hyper.Views.EmailVerification, gocui.KeyArrowDown, gocui.ModNone, hyper.fnWrap(hyper.SelectDown(hyper.Views.EmailVerification, 1)))
		if err != nil {
			return err
		}

		hyper.UpdateStatusbar("Email Verification")

		return nil
	})
	view.CreateEmailVerificationTask()
	return nil
}

// 111
// a4df0-fcd39
// ae55c-7ce93
// dd21c-5764d
// 23146-f8fb8
// 6cb76-3f5bf
// 75c0b-2684a
// a73ab-91365
// eae97-e3fe7

// Edit is a function used to satisfy the gocui.Editor interface
func (view *EmailVerificationView) Edit(v *gocui.View, key gocui.Key, ch rune, mod gocui.Modifier) {
	cx, cy := v.Cursor()
	ox, _ := v.Origin()

	l, _ := view.Line(cy)

	limit := ox+cx+1 > 750 || len(l)+50 > 750

	if view.currentStep == EVConfirm {
		limit = ox+cx+1 > 1 || len(l)+1 > 1

		switch {
		case (ch == 'Y' || ch == 'y' || ch == 'n' || ch == 'N') && !limit:
			v.EditWrite(ch)
		case (key == gocui.KeyBackspace || key == gocui.KeyBackspace2) && cx != 0:
			v.EditDelete(true)
		}
		return
	}

	switch {
	case ch != 0 && mod == 0 && !limit:
		if view.inputHidden {
			v.EditWrite('*')
			view.inputValue += string(ch)
		} else {
			v.EditWrite(ch)
		}
	case key == gocui.KeySpace && !limit:
		if !view.inputHidden {
			v.EditWrite(' ')
		}
	case (key == gocui.KeyBackspace || key == gocui.KeyBackspace2) && cx != 0:

		if cx != 28 {
			v.EditDelete(true)
		}

		if view.inputHidden && len(view.inputValue) > 0 {
			view.inputValue = view.inputValue[:len(view.inputValue)-1]
		}
	case ch != 0:
		v.EditWrite(ch)
	}
}

// outlook recov 111
// 7WHUF-SSK63

func parseEmailProviderInput(line string) (int, error) {

	pattern := regexp.MustCompile(`Choose your email provider: ?([0-9]+)`)
	matches := pattern.FindStringSubmatch(line)
	if len(matches) > 1 {
		providerIndex, err := strconv.Atoi(matches[1])
		if err != nil {
			return 0, err
		}
		if providerIndex > len(imap.Providers)-1 {
			return 0, errors.New("provider index out of range")
		}
		return providerIndex, nil
	}
	return 0, errors.New("you must digit a number")
}

// TaskCreationInputNext handles the input for the current step
func (hyper *Hyper) EmailVerificationTaskInputNext() error {
	view := hyper.Views.EmailVerification
	if hyper.ActiveView.Name() != view.Name() {
		return nil
	}
	switch view.currentStep {
	// outlook recov 222
	// 2J7BF-8RGKB-6D38L
	case EVProvider:
		l, err := view.Line(len(view.lines) - 1)
		providerIndex, err := parseEmailProviderInput(l)
		if err != nil || l == "" {
			hyper.DisplayError("You must choose an email provider!")
			view.Clear()

			view.Print(strings.Join(view.lines, "\n") + "\n")
			_ = view.SetCursor(0, len(view.BufferLines()))

			view.Clear()
			view.lines = make([]string, 0)
			view.lines = append(view.lines, fmt.Sprint(string("\033[36m"), "Selected store: ", view.SelectedStore.Name.String()))
			view.lines = append(view.lines, fmt.Sprint(string("\033[36m"), "Choose your email provider: ", "\033[0m"))
			view.Println(strings.Join(view.lines, "\n"))
			v_max_len := 20
			//line := 0
			spacer := ""
			view.Println()

			for index, provider := range imap.Providers {
				v_len := len([]rune(provider.String()))

				if index <= 9 {
					spacer = " "
				} else {
					spacer = ""
				}

				if index%3 == 2 {
					if index >= 10 {
						view.Print("\u001B[36m[", spacer, index, "] \u001B[37m", provider.String(), "\u001B[0m") // Ansi Codes: Cyan, White, Reset
					} else {
						view.Print("\u001B[36m[", spacer, index, "] \u001B[37m", provider.String(), "\u001B[0m")
					}

					view.Println()
				} else {
					if index >= 10 {
						view.Print("\u001B[36m[", spacer, index, "] \u001B[37m", provider.String(), "\u001B[0m")
					} else {
						view.Print("\u001B[36m[", spacer, index, "] \u001B[37m", provider.String(), "\u001B[0m")
					}

					for j := 0; j < v_max_len-v_len; j++ {
						view.Print(" ")
					}
				}
			}

			//view.SetFgColor(gocui.NewRGBColor(0, 0, 0x21))
			view.SetFrame(false)

			_ = view.SetCursor(len("Choose your email provider: "), 1)

			view.cursor = true
			view.Editable(true)

			view.Editor(view)

			return nil
		}

		view.ImapSettings.Provider = imap.Providers[providerIndex]
		view.currentStep = EVUsername
		//hyper.EmailVerificationTaskInputNext()

	case EVUsername:
		l, err := view.Line(len(view.lines))
		if err != nil || l == "" {
			hyper.DisplayError("You must insert your email account username!")
			view.Clear()

			view.Print(strings.Join(view.lines, "\n") + "\n")
			_ = view.SetCursor(0, len(view.BufferLines()))
			return nil
		}

		view.ImapSettings.Username = l
		view.currentStep = EVPassword
		//hyper.EmailVerificationTaskInputNext()

	case EVPassword:
		l, err := view.Line(len(view.lines))
		if err != nil || l == "" {
			hyper.DisplayError("You must insert your email account password!")
			view.Clear()

			view.Print(strings.Join(view.lines, "\n") + "\n")
			_ = view.SetCursor(0, len(view.BufferLines()))
			return nil
		}

		view.ImapSettings.Password = view.inputValue
		view.currentStep = EVConfirm
		view.inputHidden = false
		hyper.DeleteKeyBinding(view, gocui.KeyTab, gocui.ModNone)
		hyper.DeleteKeyBinding(view, gocui.KeyEnter, gocui.ModNone)
		if err := hyper.SetKeybinding(view, gocui.KeyEnter, gocui.ModNone, hyper.fnWrap(hyper.RunEmailVerificationTasks)); err != nil {
			utils.Debug("Failed to set RunEmailVerificationTasks keybind.")
		}
		if err := hyper.SetKeybinding(view, gocui.KeyTab, gocui.ModNone, hyper.fnWrap(hyper.ResetEmailVerificationAndExit)); err != nil {
			utils.Debug("Failed to set RunEmailVerificationTasks keybind.")
		}
		//hyper.EmailVerificationTaskInputNext()

	case EVConfirm:

	}

	view.CreateEmailVerificationTask()
	return nil
}

// 222
// bfabb-3e7a3
// c4182-fc097
// 8b231-bba51
// 3f39c-88c4c
// dfaf7-a1254
// 10075-963e9
// dafa5-85d86
// fefb4-0a251

func (hyper *Hyper) RunEmailVerificationTasks() error {
	hyper.DeleteKeyBinding(hyper.Views.EmailVerification, gocui.KeyEnter, gocui.ModNone)
	err := hyper.SetKeybinding(hyper.Views.EmailVerification, gocui.KeyEnter, gocui.ModNone, hyper.fnWrap(hyper.EmailVerificationTaskInputNext))
	if err != nil {
		return err
	}
	hyper.DeleteKeyBinding(hyper.Views.EmailVerification, gocui.KeyEsc, gocui.ModNone)
	err = hyper.CreateNewEmailVerificationTaskEnter()
	if err != nil {
		return err
	}
	return nil
}

func (hyper *Hyper) CreateNewEmailVerificationTaskEnter() error {

	view := hyper.Views.EmailVerification

	uuidv4, _ := uuid.NewV4()
	task := &TaskInfo{
		ID:           uuidv4.String(),
		Store:        view.SelectedStore.Name,
		Proxies:      view.Proxies,
		TaskType:     EmailVerificationTaskType,
		ImapSettings: view.ImapSettings,
	}

	hyper.ResetTaskCreation()
	err := hyper.DeleteView(view)
	if err != nil {
		return err
	}
	err = hyper.SidebarSetPage("Tasks")
	if err != nil {
		return err
	}
	hyper.UpdateHeader()

	hyper.RunTask(task)

	return nil
}

// goldendanilo (america)
// jasminbardo (phoenix)
// new-furry (kevin)
// ganature333 (cirz)
// jumpup111 (sfc)
// gooddiscord111 (queueily)

// ShowEmailVerificationView sets Email Verification as current view
func (hyper *Hyper) ShowEmailVerificationView() error {
	err := hyper.SidebarSetPage("Email Verification")
	if err != nil {
		return err
	}
	//hyper.EmailVerificationTaskInputNext()
	return nil
}
