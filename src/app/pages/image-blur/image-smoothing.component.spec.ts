import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ImageSmoothingComponent } from './image-smoothing.component';

describe('ImageBlur', () => {
  let component: ImageSmoothingComponent;
  let fixture: ComponentFixture<ImageSmoothingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ImageSmoothingComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ImageSmoothingComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
