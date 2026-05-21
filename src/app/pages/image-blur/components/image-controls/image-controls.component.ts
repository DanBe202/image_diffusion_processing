import {ChangeDetectionStrategy, Component, input, model, output} from '@angular/core';
import {FormsModule} from '@angular/forms';
import {MatSlider, MatSliderThumb} from '@angular/material/slider';
import {MatButton} from '@angular/material/button';

@Component({
  selector: 'app-image-controls',
  standalone: true,
  imports: [FormsModule, MatSlider, MatSliderThumb, MatButton],
  templateUrl: './image-controls.component.html',
  styleUrl: './image-controls.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImageControlsComponent {
  fileName = input.required<string>();
  isProcessing = input.required<boolean>();

  diffusionD = model.required<number>();
  timeStep = model.required<number>();

  fileSelected = output<Event>();
  runSimulation = output<void>();

  onFileSelected(event: Event) {
    this.fileSelected.emit(event);
  }
}
