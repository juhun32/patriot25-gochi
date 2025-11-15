package main

import (
	"embed"
	"log"
	"os"

	"github.com/wailsapp/wails/v2"
	"github.com/wailsapp/wails/v2/pkg/options"
	"github.com/wailsapp/wails/v2/pkg/options/assetserver"
	"github.com/wailsapp/wails/v2/pkg/options/windows"
)

//go:embed all:frontend/dist
var assets embed.FS

func main() {
	f, er := os.Create("gochi.log")
	if er == nil {
		log.SetOutput(f)
		defer f.Close()
	}

	app := NewApp()

	err := wails.Run(&options.App{
		Title:     "Gochi",
		Width:     366,
		Height:    190,
		MinWidth:  366,
		MinHeight: 190,

		Frameless:       false,
		CSSDragProperty: "widows",
		CSSDragValue:    "1",
		AlwaysOnTop:     false,
		BackgroundColour: &options.RGBA{
			R: 0,
			G: 0,
			B: 0,
			A: 0,
		},

		AssetServer: &assetserver.Options{
			Assets: assets,
		},

		OnStartup: app.Startup,

		Bind: []interface{}{
			app,
		},

		Windows: &windows.Options{
			WebviewIsTransparent: true,
			WindowIsTranslucent:  true,
			BackdropType:         windows.None,
		},
	})

	if err != nil {
		println("Error:", err.Error())
	}
}
