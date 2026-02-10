import { Component, signal, computed, ViewChild, ElementRef } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms';
import {gaussianBlur, ImageBuffer} from './math/gaussian_blur';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App {

}
